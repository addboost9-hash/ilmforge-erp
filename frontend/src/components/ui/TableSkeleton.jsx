export default function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div style={{padding: '16px'}}>
      {Array.from({length: rows}).map((_, i) => (
        <div key={i} style={{display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center'}}>
          {Array.from({length: cols}).map((_, j) => (
            <div key={j} className="ilm-skeleton" style={{
              flex: j === 0 ? '0 0 32px' : 1,
              height: j === 0 ? 32 : 14,
              borderRadius: j === 0 ? '50%' : 4,
            }}/>
          ))}
        </div>
      ))}
    </div>
  );
}
