import React from "react";

interface Props {
  active: boolean;
}

export default function StatusIndicator({ active }: Props) {
  return (
    <span
      className={`status-dot ${active ? "status-dot--active" : "status-dot--inactive"}`}
      title={active ? "Intercepting" : "Inactive"}
    />
  );
}
