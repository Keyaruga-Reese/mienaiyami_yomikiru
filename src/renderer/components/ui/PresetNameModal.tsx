import Modal from "@ui/Modal";
import { keyFormatter } from "@utils/keybindings";
import { memo, useCallback, useEffect, useRef, useState } from "react";

type PresetNameModalProps = {
    onClose: () => void;
    onSave: (name: string) => void;
};

/**
 * Modal with text input for preset name. Use instead of window.prompt in Electron.
 */
const PresetNameModal = memo(({ onClose, onSave }: PresetNameModalProps) => {
    const [name, setName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = useCallback(() => {
        const trimmed = name.trim();
        if (!trimmed) return;
        onSave(trimmed);
        onClose();
    }, [name, onSave, onClose]);

    return (
        <Modal open onClose={onClose} className="preset-name-modal">
            <h3>Preset name</h3>
            <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                onKeyDown={(e) => {
                    e.stopPropagation();
                    const keyStr = keyFormatter(e, false);
                    if (keyStr === "enter") handleSubmit();
                    if (keyStr === "escape") onClose();
                }}
                placeholder="Enter preset name"
            />
            <div className="modal-actions">
                <button onClick={onClose}>Cancel</button>
                <button onClick={handleSubmit} disabled={!name.trim()}>
                    Save
                </button>
            </div>
        </Modal>
    );
});

PresetNameModal.displayName = "PresetNameModal";

export default PresetNameModal;
