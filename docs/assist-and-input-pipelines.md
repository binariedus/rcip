# Assist and input pipelines

`@binaried/rcip/assist` combines a provider-neutral orchestration hook with an
optional polished dot and floating conversation panel. It does not choose an AI
provider, contact a model, record audio, or own application credentials.

## Boundaries

Assist has two independent ordered flows:

1. The input pipeline transforms composer text or voice output into final text.
2. The decision callback may return one bounded capability-action batch, which
   the runtime invokes sequentially before requesting one summary.

```text
voice adapter ─► audio ─► transcribe ─► refine ─► text
                                                       │
composer text ─────────────────────────────────────────┘
                                                       ▼
                                             decide callback
                                                       ▼
                                          capability action batch
                                                       ▼
                                     validation / policy / confirmation
```

The input pipeline cannot invoke capabilities directly. The action batch cannot
bypass the runtime.

## Input contract

`RcipAssistInput` is either:

```ts
{ type: 'text'; text: string }
{ type: 'audio'; data: Blob; mimeType: string }
```

An `RcipAssistInputProcessor` receives the current input and a context containing
its origin, one cancellation signal, and the latest application snapshot. It
returns the next input or `null`.

- processors run exactly in declaration order;
- `null` intentionally consumes the input and starts no Assist turn;
- a final non-empty text value is automatically sent to `decide`;
- a final audio value produces `INPUT_PIPELINE_INCOMPLETE` and starts no turn;
- a processor failure produces `INPUT_PROCESSOR_FAILED` and stops the chain;
- cancellation is terminal and is not presented as an error.

Both `controller.send(text)` and `controller.submitInput(...)` use the configured
processors. This keeps typed refinement and voice refinement behavior aligned.

## Voice adapter lifecycle

A real `RcipAssistVoiceAdapter` owns browser or native-web capture:

```ts
interface RcipAssistVoiceAdapter {
  start(context: { signal: AbortSignal }): Promise<void> | void
  stop(
    context: { signal: AbortSignal },
  ): Promise<RcipAssistInput | null>
  cancel?(): Promise<void> | void
}
```

`start` may request permission and begin capture. `stop` ends capture and
returns audio, text, or `null`. `cancel` releases retained resources when the
component closes, unmounts, or the user opens chat during capture.

When no adapter is configured, Assist uses a simulation: start resolves
immediately; stop shows processing for one second and returns `null`. It never
uses `MediaRecorder` or requests microphone permission. Set `voice: false` to
disable voice input entirely.

## Example pipeline

```ts
const inputPipeline: RcipAssistInputPipeline = {
  voice: {
    start: ({ signal }) => recorder.start({ signal }),
    stop: async ({ signal }) => {
      const data = await recorder.stop({ signal })
      return { type: 'audio', data, mimeType: data.type || 'audio/webm' }
    },
    cancel: () => recorder.cancel(),
  },
  processors: [
    {
      id: 'transcribe',
      async process(input, { signal }) {
        if (input.type === 'text') return input
        const text = await transcribeOnServer(input.data, { signal })
        return { type: 'text', text }
      },
    },
    {
      id: 'refine',
      async process(input, { signal }) {
        if (input.type === 'audio') return input
        const text = await refineOnServer(input.text, { signal })
        return { type: 'text', text }
      },
    },
  ],
}
```

Keep provider credentials and sensitive processing on the server. Browser
adapters should return only the minimum data required by the next stage.

## Headless controller

`useRcipAssist` exposes the packaged UI's complete behavior:

- `inputStatus`: `idle`, `starting`, `listening`, `processing`, or `error`;
- `inputError`: stable safe failure detail or `null`;
- `startVoiceInput`, `stopVoiceInput`, and `cancelInput`;
- `submitInput` for explicit audio/text input;
- `send` for pipeline-aware composer text;
- `voiceEnabled` for custom UI decisions;
- existing conversation, confirmation, action status, and cancellation state.

An input operation and an Assist turn do not run concurrently. Closing the
packaged panel cancels active voice input but does not cancel an already-running
capability turn; that turn continues while the collapsed dot displays status.

## Packaged interaction and accessibility

- Pointer click/tap: start or stop voice input.
- Pointer double-click: open chat.
- Touch long-press: open chat.
- Keyboard Enter: open chat.
- Keyboard Space: start or stop voice input.
- Escape: close chat and restore the launcher to its configured anchor.

The panel is non-modal, traps no focus, labels every icon control, announces
status changes, restores focus to the launcher on close, and respects reduced
motion. Dragging is available from the desktop header and disabled for the
mobile bottom panel.
