import { useState } from 'react'

import type { RcipRuntime } from '@binaried/rcip'

import { AgentPanel } from './AgentPanel'
import { ControlPanel } from './ControlPanel'

interface PilotToolsProps {
  readonly runtime: RcipRuntime
}

type ActiveTool = 'agent' | 'control'

export function PilotTools({ runtime }: PilotToolsProps) {
  const [activeTool, setActiveTool] = useState<ActiveTool>('control')

  return (
    <section className="panel tool-panel" aria-labelledby="tools-heading">
      <div className="panel-heading-row tool-panel-heading">
        <div>
          <p className="eyebrow">Pilot tools</p>
          <h2 id="tools-heading">SDK workbench</h2>
        </div>
        <div className="tool-tabs" role="tablist" aria-label="Pilot tools">
          <button
            id="control-tab"
            type="button"
            role="tab"
            aria-controls="control-tabpanel"
            aria-selected={activeTool === 'control'}
            tabIndex={activeTool === 'control' ? 0 : -1}
            onClick={() => setActiveTool('control')}
          >
            Control Panel
          </button>
          <button
            id="agent-tab"
            type="button"
            role="tab"
            aria-controls="agent-tabpanel"
            aria-selected={activeTool === 'agent'}
            tabIndex={activeTool === 'agent' ? 0 : -1}
            onClick={() => setActiveTool('agent')}
          >
            AI Delegate
          </button>
        </div>
      </div>

      <div
        id="control-tabpanel"
        role="tabpanel"
        aria-labelledby="control-tab"
        hidden={activeTool !== 'control'}
      >
        <ControlPanel runtime={runtime} />
      </div>
      <div
        id="agent-tabpanel"
        role="tabpanel"
        aria-labelledby="agent-tab"
        hidden={activeTool !== 'agent'}
      >
        <AgentPanel runtime={runtime} />
      </div>
    </section>
  )
}
