function hashFloat(seed,a,b){let t=seed ^ (a*374761393) ^ (b*668265263); t=(t^(t>>13))*1274126177; t ^= t>>16; return ((t>>>0)%4294967296)/4294967295;}
const seed=12345;
const counts4=[0,0,0,0];
const counts3=[0,0,0];
for(let y=0;y<200;y++){
  for(let x=0;x<200;x++){
    const v=hashFloat(seed,x+7,y+13);
    counts4[Math.floor(v*4)%4]++;
    counts3[Math.floor(v*3)%3]++;
  }
}
console.log('4 variants', counts4);
console.log('3 variants', counts3);
