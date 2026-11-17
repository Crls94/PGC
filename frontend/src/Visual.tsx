export function StateBadge({ state }: { state: string }) { return <span className={'badge badge-' + state}>{state.replaceAll('_', ' ')}</span>; }
