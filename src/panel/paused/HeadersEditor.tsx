import React from "react";

interface Props {
  headers: Array<{ name: string; value: string }>;
  onChange: (headers: Array<{ name: string; value: string }>) => void;
}

export default function HeadersEditor({ headers, onChange }: Props) {
  const updateHeader = (index: number, field: "name" | "value", val: string) => {
    const updated = headers.map((h, i) => (i === index ? { ...h, [field]: val } : h));
    onChange(updated);
  };

  const removeHeader = (index: number) => {
    onChange(headers.filter((_, i) => i !== index));
  };

  const addHeader = () => {
    onChange([...headers, { name: "", value: "" }]);
  };

  return (
    <div className="headers-editor">
      {headers.map((header, i) => (
        <div key={i} className="header-row">
          <input
            type="text"
            value={header.name}
            onChange={(e) => updateHeader(i, "name", e.target.value)}
            placeholder="Header name"
            className="header-name"
          />
          <input
            type="text"
            value={header.value}
            onChange={(e) => updateHeader(i, "value", e.target.value)}
            placeholder="Value"
            className="header-value"
          />
          <button className="btn btn-sm btn-danger" onClick={() => removeHeader(i)}>
            x
          </button>
        </div>
      ))}
      <button className="btn btn-sm" onClick={addHeader}>
        + Add Header
      </button>
    </div>
  );
}
