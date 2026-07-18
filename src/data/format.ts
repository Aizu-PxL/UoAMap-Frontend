import type { TimeSlot } from "./types";

const timeFormat = new Intl.DateTimeFormat("ja-JP", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});

export function formatTimeSlot(slot: TimeSlot): string {
  return `${timeFormat.format(new Date(slot.start))}〜${timeFormat.format(new Date(slot.end))}`;
}

export function formatTimeSlots(slots: TimeSlot[]): string {
  return slots.map(formatTimeSlot).join(" / ");
}
