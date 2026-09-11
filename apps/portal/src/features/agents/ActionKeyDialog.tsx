import { useState } from "react";

interface Props {
  actionKey: string;
  onClose: () => void;
}

export function ActionKeyDialog({ actionKey, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(actionKey);
    setCopied(true);
  }

  return (
    <div className="agent-dialog-backdrop" role="presentation">
      <section className="agent-dialog action-key-dialog" role="dialog" aria-modal="true" aria-labelledby="action-key-title">
        <header><div><p className="eyebrow">Secret generated</p><h2 id="action-key-title">Save this action key</h2></div></header>
        <p>This key is shown only once. Store it in your secret manager and configure the Retell request header expected by the agent-authentication middleware.</p>
        <div className="action-key-value"><code>{actionKey}</code></div>
        <button className="button secondary" type="button" onClick={() => void copy()}>{copied ? "Copied" : "Copy key"}</button>
        <p className="action-key-warning">Closing this dialog permanently hides the plaintext key. The database contains only its SHA-256 hash.</p>
        <footer><button className="button primary" type="button" onClick={onClose}>I saved the key</button></footer>
      </section>
    </div>
  );
}
