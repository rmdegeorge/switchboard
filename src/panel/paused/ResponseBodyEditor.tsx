interface Props {
  body: string;
  onChange: (body: string) => void;
}

export default function ResponseBodyEditor({ body, onChange }: Props) {
  const formatJson = () => {
    try {
      const parsed: unknown = JSON.parse(body);
      onChange(JSON.stringify(parsed, null, 2));
    } catch {
      // Not valid JSON, leave as-is
    }
  };

  return (
    <div className="body-editor">
      <div className="body-editor-toolbar">
        <button className="btn btn-sm" onClick={formatJson}>
          Format JSON
        </button>
      </div>
      <textarea
        className="body-textarea"
        value={body}
        onChange={(e) => onChange(e.target.value)}
        rows={16}
        spellCheck={false}
      />
    </div>
  );
}
