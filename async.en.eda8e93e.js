(self.webpackChunkgi_builds=self.webpackChunkgi_builds||[]).push([[931],{209:(t,e,n)=>{n.r(e),n.d(e,{TeyvatMap:()=>I});var o=n(584);function i(t,e){const n=t.getBoundingClientRect();let o=n.width,i=n.height,s=0,a=0,l=256,c=0,u=0,h=0,f=1/0;this.getLon=()=>s,this.getLat=()=>a,this.getZoom=()=>l,this.getProjConv=()=>e,this.getShift=()=>[c,u],this.getViewBoxShift=()=>[c-o/2,u-i/2],this.getViewBoxSize=()=>[o,i],this.getZoomRange=()=>[h,f],this.setZoomRange=(t,e)=>{h=t,f=e};const m=document.createElement("canvas");m.className="locmap-canvas",m.style.position="absolute",m.style.left="0",m.style.top="0",m.style.width="100%",m.style.height="100%",t.appendChild(m);const A=m.getContext("2d");function g(){s=e.x2lon(c,l),a=e.y2lat(u,l)}function d(){c=e.lon2x(s,l),u=e.lat2y(a,l)}this.getWrap=()=>t,this.getCanvas=()=>m,this.get2dContext=()=>A,this.lon2x=t=>e.lon2x(t,l),this.lat2y=t=>e.lat2y(t,l),this.meters2pixCoef=t=>e.meters2pixCoef(t,l),this.x2lon=t=>e.x2lon(t,l),this.y2lat=t=>e.y2lat(t,l);const p=[];this.register=t=>{if(p.includes(t))throw new Error("already registered");p.push(t),t.register&&t.register(this)},this.unregister=t=>{const e=p.indexOf(t);if(-1===e)throw new Error("not registered yet");p.splice(e,1),t.unregister&&t.unregister(this)},this.getLayers=()=>p,this.updateLocation=(t,e,n)=>{s=t,a=e,l=n,d(),w(),z()};const w=()=>{for(let t=0;t<p.length;t++){const e=p[t];e.update&&e.update(this)}},y=()=>{if(null!==A){A.clearRect(0,0,m.width,m.height),A.scale(devicePixelRatio,devicePixelRatio);for(let t=0;t<p.length;t++){const e=p[t];e.redraw&&e.redraw(this)}A.scale(1/devicePixelRatio,1/devicePixelRatio)}},v=1e-4;let x=0,b=0,M=0,C=0,E=1,S=0,B=0,k=0,I=0;const L=t=>{const e=t;if(Math.abs(E-1)>v){const t=e-b;let n;if(1===x)n=E**t,E=1+(E-1)*.993**t;else{let e=1+(E-1)*.983**t;Math.abs(e-1)<=v&&(e=1),n=E/e,E=e}this.zoom(M,C,n),b=e}if(k**2+I**2>1e-4){const t=e-B;let n,o;if(1===S){n=k*t,o=I*t;const e=.993**t;k*=e,I*=e}else{let e=.985**t;(k*e)**2+(I*e)**2<1e-4&&(e=0),n=k*(1-e),o=I*(1-e),k*=e,I*=e}this.move(n,o),B=e}};let R=!1;function z(){R||(R=!0,requestAnimationFrame(D))}function D(t){R=!1,L(performance.now()),y()}this.requestRedraw=z,this.resize=()=>{const e=t.getBoundingClientRect();m.width=e.width*devicePixelRatio,m.height=e.height*devicePixelRatio,o=e.width,i=e.height,z()},this.zoom=(t,e,n)=>{const s=l;l=r(h,f,l,n);const a=l/s;c+=(o/2-t-c)*(1-a),u+=(i/2-e-u)*(1-a),g(),w(),z(),this.emit("mapZoom",{x:t,y:e,delta:n})},this.zoomSmooth=(t,e,n,o)=>{0!==x&&(E=1),E=r(h/l,f/l,E,n),M=t,C=e,b=o,x=0,L(o)},this.move=(t,e)=>{c-=t,u-=e,g(),w(),z(),this.emit("mapMove",{dx:t,dy:e})},this.moveSmooth=(t,e,n)=>{0!==S&&(k=I=0),k+=t,I+=e,B=n,S=0,L(n)},this.applyMoveInertia=(t,e,n)=>{k=t,I=e,B=n,S=1,L(n)},this.applyZoomInertia=(t,e,n,o)=>{E=n,M=t,C=e,b=o,x=1,L(o)},this.emit=(t,e)=>{for(let n=0;n<p.length;n++){const o=p[n],i=o.onEvent&&o.onEvent[t];i&&i(this,e)}},d()}function r(t,e,n,o){return n*=o,o<1&&n<t&&(n=t),o>1&&n>e&&(n=e),n}function s(){}function a(t,e){for(let n=0;n<t.length;n++)if(t[n].identifier===e)return t[n];return null}function l(t,e){const n=a(t,e);if(null===n)throw new Error(`touch #${e} not found`);return n}function c(t){t[0].addEventListener(t[1],t[2],{capture:!0,passive:!1})}function u(t){t[0].removeEventListener(t[1],t[2],{capture:!0})}function h(t,e,n,o){return Math.sqrt((n-t)*(n-t)+(o-e)*(o-e))}function f(t,e,n){let o=0,i=0,r=0,s=0,a=0;const l=t.length,c=performance.now(),u=t[l-1];let h=u;for(let n=l-1;n>0;n--){const l=t[n-1];if(c-l.stamp>150)break;const u=h.stamp-l.stamp,f=h[e]-l[e];if(0===u)continue;const m=h.stamp,A=f/u;o+=m,i+=A,r+=m*m,s+=m*A,a++,h=l}if(1===a){const t=u.stamp-h.stamp,n=u[e]-h[e];return t<4?0:n/t}if(0===a)return 0;const f=a*r-o*o;if(0===f)return 0;const m=(a*s-o*i)/f;let A=m*n+(i-m*o)/a;return A*(u[e]-h[e])<0&&(A=0),A}function m(t){const{doNotInterfere:e}=t||{};let n,o=0,i=0,r=0,m=0,A=null,g=0,d=0,p=0,w=0,y=1,v=0,x=[{x:0,y:0,stamp:0}],b=[{dist:0,stamp:0}];for(const t of[x,b])for(;t.length<5;)t.push(Object.assign({},t[0]));function M(t,e){const n=t[t.length-1];if(n.stamp===e)return n;const o=t.shift();return t.push(o),o}function C(t){const e=M(x,t);e.x=o,e.y=i,e.stamp=t}function E(){const t=x[x.length-1],e=o-t.x,n=i-t.y;for(let t=0;t<x.length;t++)x[t].x+=e,x[t].y+=n}function S(t,e,n){const r=n-v,s=function(t,e,n){return Math.max(0,Math.min(1,n))}(0,0,(150-r)/150*2);o=(g+p*r)*s+t*(1-s),i=(d+w*r)*s+e*(1-s)}function B(t,n){return e&&"mouse"!==n&&t.timeStamp-v>1e3}const k=t=>{const n=t.getCanvas();return n.style.cursor="grab",function(t){let e,n,o,i,r,h,f,m,A,g,d,p,w,y;const{singleDown:v=s,singleMove:x=s,singleUp:b=s}=t,{doubleDown:M=s,doubleMove:C=s,doubleUp:E=s}=t,{singleHover:S=s,singleLeave:B=s,wheelRot:k=s}=t,I=[],L=(_=()=>i,function(t){return e=>{let n=0,o=0;const i=_();i&&({left:n,top:o}=i.getBoundingClientRect()),t(e,-n,-o)&&e.preventDefault()}}),R=L((function(t,e,n){return 0===t.button&&(c(h),c(f),u(A),v(t,"mouse",t.clientX+e,t.clientY+n,!1))})),z=L((function(t,e,n){return x(t,"mouse",t.clientX+e,t.clientY+n)})),D=L((function(t,e,n){return 0===t.button&&(u(h),u(f),c(A),b(t,"mouse",!1))})),Z=L((function(t,e,n){return S(t,t.clientX+e,t.clientY+n)})),X=L((function(t,e,n){return B(t,t.clientX+e,t.clientY+n)})),O=L((function(t,e,n){const o=I.length;if(2===o)return!1;const i=t.changedTouches;if(0===o&&(c(p),c(w),c(y)),0===o&&1===i.length){const o=t.changedTouches[0];return I.push(o.identifier),v(t,I[0],o.clientX+e,o.clientY+n,!1)}let r,s,a=!1;0===o?(r=i[0],s=i[1],I.push(r.identifier),a=v(t,r.identifier,r.clientX+e,r.clientY+n,!1)):(r=l(t.touches,I[0]),s=t.changedTouches[0]),I.push(s.identifier);const u=b(t,r.identifier,!0);a=a||u;const h=r.clientX+e,f=r.clientY+n,m=s.clientX+e,A=s.clientY+n,g=M(t,I[0],h,f,I[1],m,A);return a||g})),P=L((function(t,e,n){const o=I.length;if(1===o){const o=a(t.changedTouches,I[0]);return null!==o&&x(t,I[0],o.clientX+e,o.clientY+n)}if(2===o){const o=l(t.touches,I[0]),i=l(t.touches,I[1]),r=o.clientX+e,s=o.clientY+n,a=i.clientX+e,c=i.clientY+n;return C(t,I[0],r,s,I[1],a,c)}})),W=[],Y=L((function(t,e,n){const o=I.length;if(0===o)return!1;const i=I[0],r=I[1];W.length=0;for(let e=I.length-1;e>=0;e--)for(let n=0;n<t.changedTouches.length;n++){const o=t.changedTouches[n];if(o.identifier===I[e]){I.splice(e,1),W.push(o);break}}if(0===W.length)return!1;if(o===W.length&&(u(p),u(w),u(y)),1===o)return b(t,W[0].identifier,!1);const s=1===W.length?l(t.touches,I[0]):W[1],a=E(t,i,r),c=v(t,s.identifier,s.clientX+e,s.clientY+n,!0);let h=!1;return 2===o&&2===W.length&&(h=b(t,s.identifier,!1)),a||c||h})),T=L((function(t,e,n){Y(t)})),G=function(t,e){const n=[];return n[WheelEvent.DOM_DELTA_PIXEL]=1,n[WheelEvent.DOM_DELTA_LINE]=20,n[WheelEvent.DOM_DELTA_PAGE]=50,t((function(t,o,i){const r=n[t.deltaMode];return e(t,t.deltaX*r,t.deltaY*r,t.deltaZ*r,t.clientX+o,t.clientY+i)}))}(L,k);var _;return function(t){let e=null;return{get isOn(){return!!e},on(n){return e||(e=t(n),e[1].map(c)),this},off(){return e&&(e[0].map(u),e=null),this}}}((t=>{return e=t.startElem,n=t.moveElem??window,o=t.leaveElem??e,s=t.offsetElem,a=e,i="no-offset"===s?null:s??a,r=[e,"mousedown",R],h=[n,"mousemove",z],f=[n,"mouseup",D],m=[e,"wheel",G],A=[n,"mousemove",Z],g=[o,"mouseleave",X],d=[e,"touchstart",O],p=[n,"touchmove",P],w=[n,"touchend",Y],y=[n,"touchcancel",T],[[r,h,f,A,g,m,d,p,w,y],[r,d,A,g,m]];var s,a}))}({singleDown:(e,o,i,s,a)=>!B(e,o)&&(t.getWrap().focus(),S(i,s,e.timeStamp),a&&E(),a||(C(e.timeStamp),t.applyMoveInertia(0,0,e.timeStamp),t.applyZoomInertia(0,0,1,e.timeStamp),r=0,A=null),t.emit("singleDown",{x:i,y:s,id:o,isSwitching:a}),n.style.cursor="grabbing",!0),singleMove(e,n,s,a){if(B(e,n))return t.emit("controlHint",{type:"use_two_fingers"}),!1;const l=o,c=i;return S(s,a,e.timeStamp),r+=h(l,c,o,i),t.move(o-l,i-c),C(e.timeStamp),t.emit("singleMove",{x:s,y:a,id:n}),!0},singleUp(e,s,a){const l=e.timeStamp;if(a||function(t,e){const n=f(x,"x",e),r=f(x,"y",e),s=f(b,"dist",e)/y+1;t.applyMoveInertia(n,r,performance.now()),t.applyZoomInertia(o,i,s,performance.now())}(t,l),t.emit("singleUp",{x:o,y:i,id:s,isSwitching:a}),r<5&&!a)if(A){t.zoomSmooth(o,i,.5,l);const[e,n,r,s,a,c]=A;t.emit("doubleClick",{id0:e,x0:n,y0:r,id1:s,x1:a,y1:c})}else{const e=m>l-500;m=l,e&&t.zoomSmooth(o,i,2,l),t.emit(e?"dblClick":"singleClick",{x:o,y:i,id:s})}return n.style.cursor="grab",!0},doubleDown:(e,n,r,s,a,l,c)=>(o=.5*(r+l),i=.5*(s+c),y=h(r,s,l,c),g=o,d=i,E(),A=[n,r,s,a,l,c],t.emit("doubleDown",{id0:n,x0:r,y0:s,id1:a,x1:l,y1:c}),!0),doubleMove(e,n,s,a,l,c,u){const f=.5*(s+c),m=.5*(a+u),p=h(s,a,c,u);var w,v,E,S;return w=f,v=m,E=p,S=e.timeStamp,(o!==w||i!==v||y!==E||x[x.length-1].stamp!==S)&&(t.move(f-o,m-i),t.zoom(f,m,p/y),r+=h(o,i,f,m)+Math.abs(p-y),A=[n,s,a,l,c,u],o=f,i=m,y=p,g=f,d=m,C(e.timeStamp),function(t){const e=M(b,t);e.dist=y,e.stamp=t}(e.timeStamp),t.emit("doubleMove",{id0:n,x0:s,y0:a,id1:l,x1:c,y1:u})),!0},doubleUp(e,n,o){const i=e.timeStamp;return p=f(x,"x",i),w=f(x,"y",i),v=e.timeStamp,t.emit("doubleUp",{id0:n,id1:o}),!0},wheelRot:(n,o,i,r,s,a)=>!e||n.ctrlKey||n.metaKey?(t.zoomSmooth(s,a,Math.pow(2,-i/240),n.timeStamp),!0):(t.emit("controlHint",{type:"use_control_to_zoom"}),!1),singleHover(e,n,o){t.emit("singleHover",{x:n,y:o})}}).on({startElem:n})};this.register=t=>{n=k(t)},this.unregister=t=>{n.off()}}function A(t){const{outlineFix:e="none"}=t||{};let n,o=-1;this.register=t=>{const i=t.getWrap();o=i.tabIndex,i.tabIndex=1,null!==e&&(i.style.outline=e),n=(t=>e=>{if(e.ctrlKey||e.altKey)return;let n=!0;const{key:o,shiftKey:i,timeStamp:r}=e,[s,a]=t.getViewBoxSize(),l=75*(i?3:1),c=2*(i?2:1);"ArrowUp"===o?t.moveSmooth(0,l,r):"ArrowDown"===o?t.moveSmooth(0,-l,r):"ArrowLeft"===o?t.moveSmooth(l,0,r):"ArrowRight"===o?t.moveSmooth(-l,0,r):"="===o||"+"===o?t.zoomSmooth(s/2,a/2,c,r):"-"===o||"_"===o?t.zoomSmooth(s/2,a/2,1/c,r):n=!1,n&&e.preventDefault()})(t),i.addEventListener("keydown",n)},this.unregister=t=>{const e=t.getWrap();e.tabIndex=o,e.removeEventListener("keydown",n)}}function g(t,e){const n=[new m(t),new A(e)];this.register=t=>{for(const e of n)e.register(t)},this.unregister=t=>{for(const e of n)e.unregister(t)}}function d(t,e,n){const o=new Map;let i=new Set;const r=[];let s=[0,0,0,0,0],a=0;function l(t,n,i,r,s){const l=`${n}|${i}|${r}`;let c=o.get(l);return!c&&s&&(c=function(t,n,o,i){const r={img:null,clear:null,x:n,y:o,z:i,appearAt:0,lastDrawIter:a};return e(n,o,i,((e,n)=>{r.img=e,r.clear=n,t.requestRedraw()})),r}(t,n,i,r),o.set(l,c)),c}function c(t,e,n,o,i){const r=l(t,e,n,o,!1);return!!r&&!!r.img&&h(r)&&(!i||u(r)>=1)}function u(t){return(performance.now()-t.appearAt)/150}function h(t){return t.lastDrawIter>=a-1}function f(t,e,n,o,i,r,s,a,c,u,h,f){const A=l(t,a,c,u,h);return!!A&&m(t,A,e,n,o,i,r,s,f)}function m(e,n,o,r,l,c,f,m,A){if(!n.img)return!1;const g=n.z-m,d=2**g,p=n.x-c*d,w=n.y-f*d,y=function(t){return"src"in t}(v=n.img)?v.naturalWidth:v.width;var v;let x,b,M,C;if(g>=0){if(p<0||w<0||p>=d||w>=d)return!1;C=t*l/d,o+=p*C,r+=w*C,x=0,b=0,M=y}else{if(M=y*d,x=-p*y,b=-w*y,x<0||b<0||x>=y||b>=y)return!1;C=t*l}return function(t,e,n,o,r,l,c,f,m,A,g){const d=t.get2dContext();if(!d)return;h(e)||(function(t){const[e,n,o,i,r]=s,{x:a,y:l,z:c}=t;return c===r&&(a<e||a>=e+o||l<n||l>=n+i)}(e)?e.appearAt=0:e.appearAt=performance.now()-16),e.lastDrawIter=a,i.add(e);const p=devicePixelRatio,w=Math.round(f*p)/p,y=Math.round(m*p)/p;A=Math.round((f+A)*p)/p-w,g=Math.round((m+g)*p)/p-y;const v=n?u(e):1;v<1&&(d.globalAlpha=v),d.drawImage(e.img,o,r,l,c,w,y,A,g),v<1&&(d.globalAlpha=1,t.requestRedraw())}(e,n,A,x,b,M,M,o,r,C,C),!0}function A(e,o,i,s,a,l,u,h){if(!c(e,a,l,u,!0)){const h=c(e,2*a,2*l,u+1,!1)&&c(e,2*a,2*l+1,u+1,!1)&&c(e,2*a+1,2*l,u+1,!1)&&c(e,2*a+1,2*l+1,u+1,!1);let A=!1;if(!h){const n=Math.max(u-5,Math.log2(e.getZoomRange()[0]/t)-1);for(let t=u-1;t>=n;t--){const n=u-t;if(A=f(e,o,i,s,a,l,u,a>>n,l>>n,u-n,!1,!1),A)break}}let g=!1;if(!A&&(n?.(e,a,l,u,o,i,t,s),h)){for(let t=0;t<=1;t++)for(let n=0;n<=1;n++)f(e,o,i,s,a,l,u,2*a+t,2*l+n,u+1,!1,!1);g=!0}for(let t=0;t<r.length;t++){const n=r[t];(!g||n.z>=u+2)&&m(e,n,o,i,s,a,l,u,!0)}}f(e,o,i,s,a,l,u,a,l,u,h,!0)}this.draw=(e,n,c,u,h,f,m,g,d,p)=>{const[w,y]=e.getViewBoxSize(),v=Math.ceil(w/t+1)*Math.ceil(y/t+1);if(r.length=0,i.forEach((t=>t.z>=d+1&&r.length<2*v&&r.push(t))),i.clear(),a++,p)for(let t=m/3|0;t<2*m/3;t++)for(let n=g/3|0;n<2*g/3;n++)l(e,h+t,f+n,d,!0);for(let o=0;o<m;o++)for(let i=0;i<g;i++)A(e,n+o*t*u,c+i*t*u,u,h+o,f+i,d,p);const x=8*v|0;for(let t=0;t<4&&o.size>x;t++){let t=a-1;o.forEach((e=>t=Math.min(t,e.lastDrawIter))),o.forEach(((e,n)=>{e.lastDrawIter===t&&(o.delete(n),i.delete(e),e.clear?.())}))}s=[h,f,m,g,d]},this.getTileWidth=()=>t,this.clearCache=()=>{o.forEach((t=>t.clear?.())),o.clear(),i.clear(),r.length=0}}function p(t){let e=!0,n=0,o=1,i=-1,r=0;this.unregister=e=>{t.clearCache()},this.redraw=n=>{const o=t.getTileWidth(),i=Math.floor(Math.log2(n.getZoom()/o)+.4),r=2**i,s=n.getZoom()/o/r,a=o*s,[l,c]=n.getViewBoxShift(),[u,h]=n.getViewBoxSize(),f=Math.floor(l/a),m=f*a-l,A=Math.floor(c/a),g=A*a-c,d=1+((u-m)/a|0),p=1+((h-g)/a|0);t.draw(n,m,g,s,f,A,d,p,i,e)},this.onEvent={mapZoom(t,{delta:s}){const a=performance.now(),l=a-n;l>250&&(o=1),n=a,o*=s,(o<1/1.2||o>1.2)&&(0===l||Math.abs(s**(1/l)-1)>5e-4)&&(e||a-r>1e3)&&function(t,n){e&&(r=performance.now(),e=!1),clearTimeout(i),i=window.setTimeout((()=>{e=!0,t.requestRedraw()}),80)}(t)}}}var w=n(396);function y(t,e){let n,o,i,r,s=new Uint8Array(e),a=0,l=0;for(n=0;n<t.length;n++)o=t.charCodeAt(n),i=126===o,r=l+((i?125:o)-35),s.fill(a,l,r),l=r,a^=!i;return s}function v(t){const e=new Map;for(const n of t){const[t,[o,i,r,s],a]=n,l=r-o+1,c=y(a,l*(s-i+1));e.set(t,((t,e)=>t>=o&&t<=r&&e>=i&&e<=s&&!!c[t-o+(e-i)*l]))}return(t,n,o)=>!!e.get(o)?.(t,n)}var x=n(222),b=n(49);const M=256;let C="jpg";new Promise((t=>{const e=new Image;e.src="data:image/avif;base64,AAAAGGZ0eXBhdmlmAAAAAG1pZjFtaWFmAAAA621ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAHBpY3QAAAAAAAAAAAAAAAAAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABCwAAABYAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgSAAAAAAABNjb2xybmNseAABAA0ABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB5tZGF0EgAKBzgADlAQ0GkyCRAAAAAP+j9P4w==",e.onload=()=>t(!0),e.onerror=()=>t(!1)})).then((t=>t&&(C="avif")));const E="https://genshin-base.github.io/teyvat-map/v2.6/tiles",S={},B={};fetch(`${E}/summary.json`).then((t=>t.json())).then((t=>{for(const e in t)S[e]=t[e][0],B[e]=v(t[e])}));const k={x2lon:(t,e)=>t/e*M,y2lat:(t,e)=>t/e*M,lon2x:(t,e)=>t*e/M,lat2y:(t,e)=>t*e/M,meters2pixCoef:(t,e)=>e/M},I=(0,b.X)((function({classes:t="",mapCode:e,pos:n,markers:r}){const s=(0,w.sO)(null),a=(0,w.sO)(null),l=(0,w.sO)("teyvat");return(0,w.d4)((()=>{if(!s.current)return;function t(t,e,n){const o=B[l.current];return!o||o(t,e,n)}const e=(n=(t,e,n)=>function(t,e,n,o){return`${E}/${o}/${C}/${n}/${t}/${e}.${C}`}(t,e,n,l.current),(t,e,o,i)=>{const r=new Image;r.src=n(t,e,o);const s=()=>function(t){t.src=""}(r);r.onload=()=>{const t=window.createImageBitmap;t?t(r).then((t=>i(t,(()=>function(t){t.close()}(t)))),(()=>i(r,s))):i(r,s)},i(null,s)});var n;const o=new d(192,((n,o,i,r)=>{t(n,o,i)&&e(n,o,i,r)}),((e,n,o,i,r,s,a,l)=>{t(n,o,i)&&function(t,e,n,o,i,r,s,a){const l=t.get2dContext();if(null===l)return;const c=s*a;l.strokeStyle="#8883",l.strokeRect(i+1.5,r+1.5,c-3,c-3)}(e,0,0,0,r,s,a,l)})),r=new i(s.current,k),c=new L,u=new R;return r.setZoomRange(5.65685424949238,512),r.register(u),r.register(new p(o)),r.register(c),r.register(new g),r.requestRedraw(),r.resize(),addEventListener("resize",r.resize),a.current={map:r,markersLayer:c,movementClampLayer:u,tileContainer:o},()=>{r.getLayers().forEach(r.unregister),removeEventListener("resize",r.resize),a.current=null}}),[]),(0,w.d4)((()=>{const t=a.current;l.current=e,t?.markersLayer.setMapCode(e),t?.movementClampLayer.setMapCode(e),t?.tileContainer.clearCache(),t?.map.requestRedraw()}),[e]),(0,w.d4)((()=>{a.current?.markersLayer.setMarkers(r??[])}),[r]),(0,w.d4)((()=>{const t=a.current?.map;if(!t)return;const{x:o,y:i,level:s}="auto"===n?function(t,e,n){let o=1e10,i=-1e10,r=1e10,s=-1e10;for(const t of e)t.mapCode===n&&(o>t.x&&(o=t.x),i<t.x&&(i=t.x),r>t.y&&(r=t.y),s<t.y&&(s=t.y));const[a,l]=t.getViewBoxSize(),c=Math.min(a/(i-o),l/(s-r))/1.25;let u=c===1/0||c<0?-1.2:Math.log2(c);return u=(0,x.uZ)(-5.5,u,1),{x:(o+i)/2,y:(r+s)/2,level:u}}(t,r??[],e):n;t.updateLocation(o,i,M*2**s)}),[n,r,e]),(0,o.tZ)("div",{ref:s,class:"teyvat-map position-relative "+t,style:{backgroundColor:"black"}},void 0)}));class L{map=null;markers=[];iconCache=new Map;mapCode="teyvat";loadMarkerImg(t,e){const n=t+"|"+e,o=this.iconCache.get(n);if(o)return o.img&&this.map?.requestRedraw(),o;{const o=new Image,i={img:null};return o.src=t,o.onload=()=>{i.img="outline"===e?function(t,e,n){const o=document.createElement("canvas");o.width=t.naturalWidth,o.height=t.naturalHeight;const i=o.getContext("2d");if(i){i.shadowBlur=1,i.shadowColor="black";for(let e=0;e<3;e++)i.drawImage(t,0,0)}return o}(o):o,this.map?.requestRedraw()},this.iconCache.set(n,i),i}}setMapCode(t){this.mapCode=t}setMarkers(t){this.markers.length=0;{const t=this.iconCache;for(const e of t.keys()){if(t.size<30)break;t.delete(e)}}for(const e of t){const t={...e,icon:this.loadMarkerImg(e.icon,e.style),style:e.style};this.markers.push(t)}}redraw(t){const e=t.get2dContext();if(!e)return;const[n,o]=t.getViewBoxShift(),i=Math.min(1,(t.getZoom()/192-1)/2+1);for(let r=0,s=this.markers;r<s.length;r++){const a=s[r];if(a.mapCode!==this.mapCode)continue;const l=t.lon2x(a.x)-n,c=t.lat2y(a.y)-o,u=40*i,h=1.5*i,f="circle"===a.style;f&&(e.beginPath(),e.arc(l,c,u/2+h/2+.75,0,2*Math.PI,!1),e.fillStyle="#333",e.fill());const m=a.icon.img;if(null!==m){const t="naturalWidth"in m,n=t?m.naturalWidth:m.width,o=t?m.naturalHeight:m.height,i=Math.min(u/n,u/o),r=n*i,s=o*i;f&&(e.save(),e.beginPath(),e.arc(l,c,u/2-h/2-.75,0,2*Math.PI,!1),e.clip()),e.drawImage(m,l-r/2,c-s/2,r,s),f&&e.restore()}f&&(e.beginPath(),e.arc(l,c,u/2,0,2*Math.PI,!1),e.strokeStyle="white",e.lineWidth=h,e.stroke())}}register(t){this.map=t}unregister(t){this.map=null,this.markers.length=0}}class R{mapCode="teyvat";isGrabbing=!1;isZoomIn=!1;xOffset=0;yOffset=0;onEvent=(()=>{const t=()=>{this.isGrabbing=!0},e=t=>{this.isGrabbing=!1,t.requestRedraw()};let n=0;const o=t=>{this.isZoomIn=!1,t.requestRedraw()};return{singleDown:t,singleUp:e,doubleDown:t,doubleUp:e,mapZoom:(t,{delta:e})=>{e>1&&(this.isZoomIn=!0,clearTimeout(n),n=window.setTimeout(o,100,t))}}})();redraw(t){const e=S[this.mapCode];if(!e)return;this.isGrabbing||(this.xOffset*=.9,this.yOffset*=.9);let[n,o]=this.getLonLatDelta(t,e);if(this.isGrabbing||this.isZoomIn){const i=this.isZoomIn?1:.25;this.xOffset+=Math.abs(n)*i,this.yOffset+=Math.abs(o)*i,[n,o]=this.getLonLatDelta(t,e)}const i=t.lon2x(n),r=t.lat2y(o);(Math.abs(i)>.5||Math.abs(r)>.5)&&t.move(i,r)}setMapCode(t){this.mapCode=t}getLonLatDelta(t,e){let[n,[o,i,r,s]]=e;r+=1,s+=1;const a=M*.5**n;o*=a,i*=a,r*=a,s*=a;const[l,c]=t.getViewBoxSize(),u=t.x2lon(l/2),h=t.y2lat(c/2);o+=u,r-=u,i+=h,s-=h,r<o&&(o=r=(o+r)/2),s<i&&(i=s=(i+s)/2),o-=this.xOffset,r+=this.xOffset,i-=this.yOffset,s+=this.yOffset;const f=t.getLon(),m=t.getLat();let A=0,g=0;return f<o&&(A=f-o),f>r&&(A=f-r),m<i&&(g=m-i),m>s&&(g=m-s),[A,g]}}}}]);
//# sourceMappingURL=async.en.eda8e93e.js.map