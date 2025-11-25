import os from "os";
import { DeviceMetrics } from "./types";

let lastCpuInfo = os.cpus();

function estimateCpuUsage(): number {
  const cpus = os.cpus();

  let idleDiff = 0;
  let totalDiff = 0;

  cpus.forEach((cpu, idx) => {
    const prev = lastCpuInfo[idx] || cpu;
    const prevTimes = prev.times;
    const currTimes = cpu.times;

    const prevIdle = prevTimes.idle;
    const prevTotal =
      prevTimes.user +
      prevTimes.nice +
      prevTimes.sys +
      prevTimes.idle +
      prevTimes.irq;

    const currIdle = currTimes.idle;
    const currTotal =
      currTimes.user +
      currTimes.nice +
      currTimes.sys +
      currTimes.idle +
      currTimes.irq;

    idleDiff += currIdle - prevIdle;
    totalDiff += currTotal - prevTotal;
  });

  lastCpuInfo = cpus;

  if (totalDiff === 0) return 0;
  const usage = 1 - idleDiff / totalDiff;
  return Math.min(Math.max(usage, 0), 1);
}

export function getDeviceMetrics(): DeviceMetrics {
  const memoryFreeMb = Math.round(os.freemem() / (1024 * 1024));

  const storageFreeMb = 0;

  const hasNavigator =
    typeof window !== "undefined" && typeof navigator !== "undefined";

  const online = hasNavigator ? navigator.onLine : true;

  const network_type = "unknown";

  return {
    cpu_usage: estimateCpuUsage(),
    memory_free_mb: memoryFreeMb,
    storage_free_mb: storageFreeMb,
    network_type,
    online,
  };
}
