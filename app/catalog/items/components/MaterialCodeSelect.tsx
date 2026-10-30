/**
 * Free-text Material Code on the item General section.
 * @param value - Current material code
 * @param disabled - Disables the input while the form is busy
 * @param onChange - Called with the typed string
 * @param inputId - Unique id when more than one layout is in the file
 */
export function MaterialCodeSelect({
  value,
  disabled,
  onChange,
  inputId = 'materialCode',
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  inputId?: string;
}) {
  return (
    <div>
      <label className="form-label" htmlFor={inputId}>Material Code</label>
      <input
        id={inputId}
        type="text"
        className="form-control"
        aria-label="Material Code"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
