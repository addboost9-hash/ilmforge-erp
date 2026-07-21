import React from 'react';

const EMOJIS = {
  students:'👨‍🎓', staff:'👨‍🏫', fees:'💰', exams:'📝',
  attendance:'📋', reports:'📊', settings:'⚙️',
  library:'📚', transport:'🚌', communication:'📱',
  default:'📂'
};

export default function EmptyState({type='default', title, description, actionLabel, onAction, href}) {
  return (
    <div style={{
      display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',padding:'60px 20px',textAlign:'center',
      animation:'ilm-fade-in 0.4s ease-out',
    }}>
      <div style={{
        width:100,height:100,borderRadius:'50%',
        background:'linear-gradient(135deg,rgba(27,47,110,0.08),rgba(0,115,183,0.05))',
        display:'flex',alignItems:'center',justifyContent:'center',
        fontSize:48,marginBottom:20,
      }}>
        {EMOJIS[type]||EMOJIS.default}
      </div>
      <h3 style={{fontSize:18,fontWeight:700,color:'#1e3a5f',margin:'0 0 8px'}}>{title||'Nothing here yet'}</h3>
      <p style={{fontSize:13,color:'#64748b',margin:'0 0 24px',maxWidth:360,lineHeight:1.7}}>{description||'Get started by adding your first item.'}</p>
      {(onAction||href) && (
        <a href={href||'#'} onClick={onAction}
          style={{background:'linear-gradient(135deg,#1B2F6E,#0073b7)',color:'white',padding:'10px 24px',borderRadius:999,fontSize:13,fontWeight:700,textDecoration:'none',cursor:'pointer',boxShadow:'0 4px 15px rgba(27,47,110,0.3)'}}>
          + {actionLabel||'Get Started'}
        </a>
      )}
    </div>
  );
}
