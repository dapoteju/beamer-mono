# Screen Groups System

The Screen Groups system enables campaign targeting by organizing screens into logical groups. This document covers the architecture, access control, and feature enhancements.

## Overview

Screen Groups are collections of screens that can be targeted by advertising campaigns. They are scoped to publisher organizations, ensuring proper data isolation between different publishers.

### Key Features

- **Publisher Scoping**: Groups belong to a specific publisher organization
- **Access Control**: Enforced via `requirePublisherAccess` middleware
- **Overlap Detection**: Warns when screens appear in multiple selected groups
- **Targeting Preview**: Real-time warnings about targeting issues
- **Screen Integration**: View groups from both group and screen perspectives

## Architecture

### Database Schema

```sql
-- Screen Groups Table
screen_groups (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  publisher_org_id UUID REFERENCES organisations(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Screen Group Members (Join Table)
screen_group_members (
  group_id UUID REFERENCES screen_groups(id),
  screen_id UUID REFERENCES screens(id),
  added_at TIMESTAMP,
  PRIMARY KEY (group_id, screen_id)
)
```

### Access Control

#### Publisher Access Middleware

The `requirePublisherAccess` middleware enforces publisher organization boundaries:

```typescript
// middleware/permissions.ts
export function requirePublisherAccess(
  extractOrgId: (req: Request) => Promise<string | null>
): RequestHandler
```

**Behavior:**
- Beamer internal users: Full access to all resources
- Publisher users: Access restricted to own organization's resources
- Returns 404 for resources outside user's organization (security by obscurity)

**Usage:**
```typescript
router.get(
  "/:id",
  requireAuth,
  requirePublisherAccess(async (req) => {
    const group = await groupService.getById(req.params.id);
    return group?.publisherOrgId || null;
  }),
  handler
);
```

### API Endpoints

#### Screen Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/screen-groups` | List groups (filtered by publisher) |
| GET | `/api/screen-groups/:id` | Get group details |
| POST | `/api/screen-groups` | Create new group |
| PUT | `/api/screen-groups/:id` | Update group |
| DELETE | `/api/screen-groups/:id` | Delete group |
| GET | `/api/screen-groups/:id/members` | List group members |
| POST | `/api/screen-groups/:id/members` | Add screens to group |
| DELETE | `/api/screen-groups/:id/members` | Remove screens from group |
| POST | `/api/screen-groups/targeting-preview` | Get targeting preview with warnings |

#### Screen Groups from Screen

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/screens/:id/groups` | Get groups containing this screen |

## Targeting Preview

### Overview

The targeting preview system provides real-time feedback about potential issues with campaign targeting. When selecting groups for targeting, the system analyzes the selected screens and generates warnings.

### Warning Types

| Type | Description | Severity |
|------|-------------|----------|
| `offline` | Screens currently offline | High |
| `archived` | Screens that are archived | High |
| `mixed_resolution` | Screens have different resolutions | Medium |
| `low_screen_count` | Fewer than 5 eligible screens | Medium |
| `overlap` | Screens appear in multiple groups | Low |

### Overlap Detection

When multiple groups are selected for targeting, the system detects screens that appear in more than one group:

```typescript
// screenGroups.service.ts
async getTargetingPreview(groupIds: string[]): Promise<TargetingPreview> {
  // Fetch all screens from selected groups
  const screensByGroup = await this.fetchScreensForGroups(groupIds);
  
  // Detect overlaps using Set
  const screenIdCounts = new Map<string, number>();
  for (const screens of screensByGroup.values()) {
    for (const screen of screens) {
      screenIdCounts.set(
        screen.id,
        (screenIdCounts.get(screen.id) || 0) + 1
      );
    }
  }
  
  // Screens appearing more than once are overlaps
  const overlappingScreenIds = [...screenIdCounts.entries()]
    .filter(([_, count]) => count > 1)
    .map(([id]) => id);
    
  // Generate warning if overlaps exist
  if (overlappingScreenIds.length > 0) {
    warnings.push({
      type: "overlap",
      message: `${overlappingScreenIds.length} screen(s) appear in multiple selected groups`,
      screenIds: overlappingScreenIds,
      count: overlappingScreenIds.length,
    });
  }
}
```

### API Request/Response

**Request:**
```json
POST /api/screen-groups/targeting-preview
{
  "group_ids": ["uuid-1", "uuid-2"]
}
```

**Response:**
```json
{
  "data": {
    "eligible_screen_count": 42,
    "totalScreens": 50,
    "onlineScreens": 35,
    "offlineScreens": 15,
    "overlapCount": 3,
    "warnings": [
      {
        "type": "offline",
        "message": "15 screen(s) are currently offline",
        "count": 15
      },
      {
        "type": "overlap",
        "message": "3 screen(s) appear in multiple selected groups",
        "screenIds": ["uuid-a", "uuid-b", "uuid-c"],
        "count": 3
      }
    ],
    "regions": { "gauteng": 25, "western_cape": 17 },
    "resolutions": { "1920x1080": 40, "1080x1920": 10 }
  }
}
```

## Frontend Components

### ScreenGroupsTab

Displays groups that contain a specific screen on the Screen Detail page.

```tsx
import { ScreenGroupsTab } from "../components/ScreenGroupsTab";

<ScreenGroupsTab 
  screenId={screen.id} 
  publisherOrgId={screen.publisherOrgId} 
/>
```

**Features:**
- Lists all groups containing the screen
- Shows group details (name, description, member count)
- Links to group detail pages
- Handles loading and empty states

### TargetingPreviewWarnings

Displays inline warnings for targeting issues.

```tsx
import { TargetingPreviewWarnings } from "../components/TargetingPreviewWarnings";

<TargetingPreviewWarnings 
  groupIds={selectedGroupIds}
  className="mt-2"
/>
```

**Features:**
- Auto-fetches preview when group selection changes
- Debounced API calls (300ms)
- Color-coded warnings by severity
- Shows screen count summary

## Usage Examples

### Adding Publisher Access Control to Routes

```typescript
// routes.ts
import { requirePublisherAccess } from "../../middleware/permissions";

router.put(
  "/:id",
  requireAuth,
  requirePublisherAccess(async (req) => {
    const group = await screenGroupsService.getById(req.params.id);
    return group?.publisherOrgId || null;
  }),
  async (req, res) => {
    // Handler code - access control already verified
  }
);
```

### Fetching Screen's Groups in Frontend

```typescript
import { fetchScreenGroups } from "../api/screenGroups";

const groups = await fetchScreenGroups(screenId);
// Returns: ScreenGroupSummary[]
```

### Displaying Targeting Warnings

```tsx
function CampaignTargetingForm({ selectedGroupIds }) {
  return (
    <div>
      <GroupSelector 
        selected={selectedGroupIds} 
        onChange={setSelectedGroupIds} 
      />
      <TargetingPreviewWarnings 
        groupIds={selectedGroupIds}
        className="mt-4"
      />
    </div>
  );
}
```

## Security Considerations

1. **Publisher Isolation**: Groups are scoped to publisher organizations. Users can only access groups belonging to their organization.

2. **404 vs 403**: The system returns 404 for unauthorized access attempts to prevent resource enumeration attacks.

3. **Beamer Internal Override**: Internal users have full access for administrative purposes.

4. **Input Validation**: All group IDs are validated as UUIDs before database queries.

## Performance Considerations

1. **Overlap Detection**: Uses efficient Set data structures for O(n) detection
2. **Debounced API Calls**: Frontend debounces targeting preview requests
3. **Pagination**: Group member listings support pagination
4. **Indexed Queries**: Database queries use indexed columns for screen lookups
