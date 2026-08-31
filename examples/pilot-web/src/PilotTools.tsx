import type { RcipRuntime } from '@binaried/rcip'

import { ControlPanel } from './ControlPanel'

interface PilotToolsProps {
  readonly runtime: RcipRuntime
}

export function PilotTools({ runtime }: PilotToolsProps) {
  return (
    <section className="panel tool-panel" aria-labelledby="tools-heading">
      <div className="panel-heading-row tool-panel-heading">
        <div>
          <p className="eyebrow">Pilot tools</p>
          <h2 id="tools-heading">SDK workbench</h2>
        </div>
        <p className="tool-panel-note">
          The floating Assist dot is the SDK-shipped tool. This control panel
          remains a host debugging surface.
        </p>
      </div>
      <ControlPanel runtime={runtime} />
    </section>
  )
}
