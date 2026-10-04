import { createRemoteJWKSet, jwtVerify } from 'jose';
const keySets=new Map();
export function accessConfig(env){
 const team=String(env.CF_ACCESS_TEAM_DOMAIN||'').replace(/\/$/,'');
 const allowed=String(env.ALLOWED_EMAILS||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
 if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(team)||!env.CF_ACCESS_AUD||!allowed.length||!env.APP_ORIGIN)throw new Error('Access is not configured');
 const origin=new URL(env.APP_ORIGIN);if(origin.protocol!=='https:'||origin.origin!==env.APP_ORIGIN)throw new Error('A canonical HTTPS origin is required');
 return {team,audience:env.CF_ACCESS_AUD,allowed,origin:origin.origin};
}
export async function verifyAccess(request,env,resolveKeys){
 const config=accessConfig(env);
 if(new URL(request.url).origin!==config.origin)throw new Error('Unexpected origin');
 const token=request.headers.get('cf-access-jwt-assertion');if(!token)throw new Error('Authentication required');
 let keySet=resolveKeys;
 if(!keySet){if(!keySets.has(config.team))keySets.set(config.team,createRemoteJWKSet(new URL(config.team+'/cdn-cgi/access/certs'),{timeoutDuration:5000}));keySet=keySets.get(config.team);}
 const {payload}=await jwtVerify(token,keySet,{issuer:config.team,audience:config.audience,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email'],clockTolerance:5});
 if(typeof payload.sub!=='string'||!payload.sub||typeof payload.email!=='string'||!config.allowed.includes(payload.email.toLowerCase()))throw new Error('Account is not allowed');
 // Subject comes only from the signed Access JWT, never a request parameter/body.
 return {id:payload.sub,email:payload.email,origin:config.origin};
}
