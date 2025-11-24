// src/modules/player/player.service.ts
import { pool } from "../../db";
import { db } from "../../db";
import { players, screens, regions, screenLocationHistory } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { haversineDistance } from "../../utils/geo";

type PlaylistItem = {
  creative_id: string;
  campaign_id: string;
  flight_id: string;
  file_url: string;
  duration_seconds: number;
};

type PlaylistResponse = {
  screen_id: string;
  region: string;
  city: string;
  config_hash: string;
  playlist: PlaylistItem[];
};

type PlayEventInput = {
  creative_id: string;
  campaign_id: string;
  flight_id?: string | null;
  started_at: string; // ISO string
  duration_seconds: number;
  play_status: string; // "success" | "skipped" | "error" etc.
  location?: {
    lat?: number;
    lng?: number;
  };
};

type HeartbeatInput = {
  player_id: string;
  timestamp: string; // ISO string
  status: string;
  software_version?: string;
  location?: {
    lat?: number;
    lng?: number;
    accuracy_m?: number;
  };
  metrics?: {
    storage_free_mb?: number;
    cpu_usage?: number;
    network_type?: string;
    signal_strength?: number;
  };
};

type RegisterPlayerInput = {
  screen_id: string;
  software_version?: string;
};

type RegisterPlayerResponse = {
  player_id: string;
  auth_token: string;
  screen_id: string;
};

export class PlayerService {
  /**
   * Register a new player for a screen.
   * - Validates screen exists
   * - Generates unique player ID and secure auth token
   * - Stores player in database
   */
  async registerPlayer(input: RegisterPlayerInput): Promise<RegisterPlayerResponse> {
    const screen = await db.query.screens.findFirst({
      where: eq(screens.id, input.screen_id),
    });

    if (!screen) {
      throw new Error("Screen not found");
    }

    const playerId = `player_${nanoid(21)}`;
    const authToken = crypto.randomBytes(32).toString("hex");

    await db.insert(players).values({
      id: playerId,
      screenId: input.screen_id,
      authToken: authToken,
      softwareVersion: input.software_version || null,
      lastSeenAt: new Date(),
    });

    return {
      player_id: playerId,
      auth_token: authToken,
      screen_id: input.screen_id,
    };
  }

  /**
   * Validate player auth token and return player info.
   */
  async validateAuthToken(playerId: string, authToken: string): Promise<{ screen_id: string } | null> {
    const player = await db.query.players.findFirst({
      where: eq(players.id, playerId),
    });

    if (!player || player.authToken !== authToken) {
      return null;
    }

    await db
      .update(players)
      .set({ lastSeenAt: new Date() })
      .where(eq(players.id, playerId));

    return { screen_id: player.screenId };
  }

  /**
   * Build a weighted playlist for a given screen.
   * Strategy:
   *  - Find active flights targeting this screen (or screen groups)
   *  - Get their creatives + weights
   *  - Filter creatives approved for this screen's region_code
   *  - Apply requires_pre_approval checks
   *  - Expand into a weighted playlist array
   *  - Add fallback creative if playlist is empty
   */
  async getWeightedPlaylistForScreen(
    screenId: string,
    currentConfigHash?: string
  ): Promise<PlaylistResponse | { not_modified: true }> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1) Get screen + region_code + city
      const screenRow = await client.query(
        `
        SELECT
          s.id AS screen_id,
          s.region_code,
          s.city
        FROM public.screens s
        WHERE s.id = $1
        `,
        [screenId]
      );

      if (screenRow.rowCount === 0) {
        throw new Error("Screen not found");
      }

      const { screen_id, region_code, city } = screenRow.rows[0];

      // 2) Get active flights targeting this screen or screen groups
      const flightsResult = await client.query(
        `
        SELECT DISTINCT f.id, f.campaign_id
        FROM public.flights f
        WHERE f.status = 'active'
          AND now() BETWEEN f.start_datetime AND f.end_datetime
          AND (
            (f.target_type = 'screen' AND f.target_id = $1)
            OR (f.target_type = 'screen_group' AND EXISTS (
              SELECT 1 FROM public.screen_group_members sgm
              WHERE sgm.screen_id = $1 AND sgm.group_id = f.target_id
            ))
          )
        `,
        [screenId]
      );

      // 3) Get region info to check requires_pre_approval
      const regionRow = await client.query(
        `
        SELECT r.requires_pre_approval
        FROM public.regions r
        WHERE r.code = $1
        `,
        [region_code]
      );

      const requiresPreApproval = regionRow.rowCount && regionRow.rowCount > 0 
        ? regionRow.rows[0].requires_pre_approval 
        : false;

      let weightedPlaylist: PlaylistItem[] = [];

      if (flightsResult.rowCount && flightsResult.rowCount > 0) {
        const flightIds = flightsResult.rows.map((r) => r.id);
        const flightMap = new Map(flightsResult.rows.map(r => [r.id, r.campaign_id]));

        // 4) Get creatives for those flights approved for this region_code
        const creativesResult = await client.query(
          `
          SELECT DISTINCT
            c.id AS creative_id,
            c.campaign_id,
            c.file_url,
            c.duration_seconds,
            fc.flight_id,
            fc.weight,
            ca.approval_code
          FROM public.flight_creatives fc
          JOIN public.creatives c ON c.id = fc.creative_id
          JOIN public.creative_approvals ca ON ca.creative_id = c.id
          JOIN public.regions r ON r.id = ca.region_id
          WHERE fc.flight_id = ANY($1::uuid[])
            AND r.code = $2
            AND ca.status = 'approved'
            ${requiresPreApproval ? "AND ca.approval_code IS NOT NULL" : ""}
          `,
          [flightIds, region_code]
        );

        // 5) Build weighted playlist
        for (const row of creativesResult.rows) {
          const { creative_id, campaign_id, flight_id, file_url, duration_seconds, weight } = row;

          for (let i = 0; i < (weight ?? 1); i++) {
            weightedPlaylist.push({
              creative_id,
              campaign_id,
              flight_id,
              file_url,
              duration_seconds,
            });
          }
        }
      }

      // 6) If playlist is empty, try to get a fallback creative
      // IMPORTANT: Only use fallback if we have compliant creatives
      if (weightedPlaylist.length === 0) {
        const fallbackResult = await client.query(
          `
          SELECT
            c.id AS creative_id,
            c.campaign_id,
            c.file_url,
            c.duration_seconds,
            ca.approval_code
          FROM public.creatives c
          JOIN public.creative_approvals ca ON ca.creative_id = c.id
          JOIN public.regions r ON r.id = ca.region_id
          JOIN public.campaigns camp ON camp.id = c.campaign_id
          WHERE r.code = $1
            AND ca.status = 'approved'
            AND camp.status = 'active'
          ORDER BY c.created_at DESC
          LIMIT 1
          `,
          [region_code]
        );

        if (fallbackResult.rowCount && fallbackResult.rowCount > 0) {
          const fb = fallbackResult.rows[0];
          
          // Strict compliance check: if region requires pre-approval, creative MUST have approval_code
          const isCompliant = !requiresPreApproval || (fb.approval_code != null && fb.approval_code !== '');
          
          if (isCompliant) {
            weightedPlaylist.push({
              creative_id: fb.creative_id,
              campaign_id: fb.campaign_id,
              flight_id: "00000000-0000-0000-0000-000000000000",
              file_url: fb.file_url,
              duration_seconds: fb.duration_seconds,
            });
          }
        }
      }

      // 7) Shuffle for randomness
      for (let i = weightedPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [weightedPlaylist[i], weightedPlaylist[j]] = [
          weightedPlaylist[j],
          weightedPlaylist[i],
        ];
      }

      // 8) Generate config hash for 304 support
      const configData = JSON.stringify({
        screen_id,
        region: region_code,
        city,
        playlist: weightedPlaylist.map(p => ({ 
          cid: p.creative_id, 
          fid: p.flight_id,
          w: weightedPlaylist.filter(x => x.creative_id === p.creative_id).length 
        })),
      });
      const configHash = crypto.createHash("sha256").update(configData).digest("hex").substring(0, 16);

      // 9) Check if config changed
      if (currentConfigHash && currentConfigHash === configHash) {
        await client.query("COMMIT");
        return { not_modified: true };
      }

      // 10) Update player's config hash
      await client.query(
        `UPDATE public.players SET config_hash = $1 WHERE screen_id = $2`,
        [configHash, screenId]
      );

      await client.query("COMMIT");

      return {
        screen_id,
        region: region_code,
        city,
        config_hash: configHash,
        playlist: weightedPlaylist,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Record proof-of-play events for a given player.
   * - Looks up the screen_id for the player
   * - Inserts one row per event into public.play_events
   */
  async recordPlayEvents(playerId: string, events: PlayEventInput[]): Promise<void> {
    if (!events || events.length === 0) return;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Find the screen linked to this player
      const playerRes = await client.query(
        `
        SELECT screen_id
        FROM public.players
        WHERE id = $1
        `,
        [playerId]
      );

      if (playerRes.rowCount === 0) {
        throw new Error("Player not found");
      }

      const { screen_id } = playerRes.rows[0];

      for (const ev of events) {
        const lat = ev.location?.lat ?? null;
        const lng = ev.location?.lng ?? null;

        await client.query(
          `
          INSERT INTO public.play_events
            (player_id, screen_id, creative_id, campaign_id, flight_id,
             started_at, duration_seconds, play_status, lat, lng)
          VALUES
            ($1,        $2,        $3,         $4,         $5,
             $6,         $7,               $8,        $9,  $10)
          `,
          [
            playerId,
            screen_id,
            ev.creative_id,
            ev.campaign_id,
            ev.flight_id ?? null,
            ev.started_at,
            ev.duration_seconds,
            ev.play_status,
            lat,
            lng,
          ]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Record a heartbeat from a player device.
   * - Looks up the screen_id for the player
   * - Inserts into public.heartbeats
   * - Phase 3B: Updates screen location and records history for vehicle screens
   */
  async recordHeartbeat(input: HeartbeatInput): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const playerRes = await client.query(
        `
        SELECT screen_id
        FROM public.players
        WHERE id = $1
        `,
        [input.player_id]
      );

      if (playerRes.rowCount === 0) {
        throw new Error("Player not found");
      }

      const { screen_id } = playerRes.rows[0];

      const lat = input.location?.lat ?? null;
      const lng = input.location?.lng ?? null;

      const storage_free_mb = input.metrics?.storage_free_mb ?? null;
      const cpu_usage = input.metrics?.cpu_usage ?? null;
      const network_type = input.metrics?.network_type ?? null;
      const signal_strength = input.metrics?.signal_strength ?? null;

      await client.query(
        `
        INSERT INTO public.heartbeats
          (player_id, screen_id, "timestamp", status, software_version,
           storage_free_mb, cpu_usage, network_type, signal_strength,
           lat, lng)
        VALUES
          ($1,        $2,        $3,          $4,    $5,
           $6,             $7,        $8,           $9,
           $10, $11)
        `,
        [
          input.player_id,
          screen_id,
          input.timestamp,
          input.status,
          input.software_version ?? null,
          storage_free_mb,
          cpu_usage,
          network_type,
          signal_strength,
          lat,
          lng,
        ]
      );

      if (lat !== null && lng !== null) {
        const screenRes = await client.query(
          `
          SELECT screen_classification
          FROM public.screens
          WHERE id = $1
          `,
          [screen_id]
        );

        if (screenRes.rowCount && screenRes.rowCount > 0) {
          const screenClassification = screenRes.rows[0].screen_classification;

          await client.query(
            `
            UPDATE public.screens
            SET latitude = $1, longitude = $2, last_seen_at = $3
            WHERE id = $4
            `,
            [lat, lng, input.timestamp, screen_id]
          );

          if (screenClassification === 'vehicle') {
            const lastHistoryRes = await client.query(
              `
              SELECT recorded_at, latitude, longitude
              FROM public.screen_location_history
              WHERE screen_id = $1
              ORDER BY recorded_at DESC
              LIMIT 1
              `,
              [screen_id]
            );

            let shouldInsert = false;

            if (lastHistoryRes.rowCount === 0) {
              shouldInsert = true;
            } else {
              const lastHistory = lastHistoryRes.rows[0];
              const lastRecordedAt = new Date(lastHistory.recorded_at);
              const currentTime = new Date(input.timestamp);
              const timeDiffSeconds = (currentTime.getTime() - lastRecordedAt.getTime()) / 1000;

              const lastLat = parseFloat(lastHistory.latitude);
              const lastLng = parseFloat(lastHistory.longitude);
              const distanceMeters = haversineDistance(lastLat, lastLng, lat, lng);

              if (timeDiffSeconds >= 300 || distanceMeters > 200) {
                shouldInsert = true;
              }
            }

            if (shouldInsert) {
              const historyId = `slh_${nanoid(21)}`;
              await client.query(
                `
                INSERT INTO public.screen_location_history
                  (id, screen_id, player_id, recorded_at, latitude, longitude, source)
                VALUES
                  ($1, $2, $3, $4, $5, $6, 'heartbeat')
                `,
                [historyId, screen_id, input.player_id, input.timestamp, lat, lng]
              );
            }
          }
        }
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
