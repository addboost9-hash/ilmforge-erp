export default function TableSkeleton({rows=5, cols=4}) {
  return (
    <div style={{padding:20}}>
      {Array.from({length:rows}).map((_,i)=>(
        <div key={i} style={{display:'flex',gap:16,marginBottom:16,alignItems:'center',animation:`ilm-fade-in 0.3s ease-out ${i*80}ms both`}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(90deg,rgba(27,47,110,0.08) 25%,rgba(27,47,110,0.15) 50%,rgba(27,47,110,0.08) 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite',flexShrink:0}}/>
          {Array.from({length:cols}).map((_,j)=>(
            <div key={j} style={{flex:j===0?2:1,height:12,borderRadius:6,background:'linear-gradient(90deg,rgba(27,47,110,0.06) 25%,rgba(27,47,110,0.12) 50%,rgba(27,47,110,0.06) 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite'}}/>
          ))}
        </div>
      ))}
    </div>
  );
}
