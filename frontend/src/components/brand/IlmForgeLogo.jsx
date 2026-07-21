export default function IlmForgeLogo({size='md', light=false}) {
  const sizes = {sm:{font:16,sub:10}, md:{font:22,sub:13}, lg:{font:30,sub:16}};
  const s = sizes[size]||sizes.md;
  return (
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div style={{
        width:s.font*2, height:s.font*2, borderRadius:s.font*0.4,
        background:'linear-gradient(135deg,#1B2F6E,#0073b7)',
        display:'flex',alignItems:'center',justifyContent:'center',
        fontSize:s.font, boxShadow:'0 4px 12px rgba(27,47,110,0.3)',
      }}>🎓</div>
      <div>
        <div style={{fontWeight:900,fontSize:s.font,color:light?'white':'#1B2F6E',lineHeight:1,letterSpacing:-0.5}}>
          ilm<span style={{color:'#D97706',fontFamily:"'Noto Nastaliq Urdu',serif"}}>فورج</span>
        </div>
        <div style={{fontSize:s.sub,color:light?'rgba(255,255,255,0.7)':'#64748b',marginTop:1,fontWeight:500}}>
          Ilm Ko Asaan Banaye
        </div>
      </div>
    </div>
  );
}
