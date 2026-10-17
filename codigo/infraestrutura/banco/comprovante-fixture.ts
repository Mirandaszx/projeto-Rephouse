import {deflateSync} from 'node:zlib'

// PNG válido de ruído determinístico (~256 KiB), para não medir compressão de zeros.
export function receiptFixture():Buffer{
  const crc=(bytes:Buffer)=>{let value=0xffffffff;for(const byte of bytes){value^=byte;for(let n=0;n<8;n++)value=(value>>>1)^((value&1)?0xedb88320:0)}return(value^0xffffffff)>>>0}
  const chunk=(type:string,data:Buffer)=>{
    const body=Buffer.concat([Buffer.from(type),data]),size=Buffer.alloc(4),checksum=Buffer.alloc(4)
    size.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(body));return Buffer.concat([size,body,checksum])
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(256,0);header.writeUInt32BE(256,4);header[8]=8;header[9]=6
  const pixels=Buffer.alloc(256*(1024+1));let state=0x13adbeef
  for(let row=0;row<256;row++)for(let col=1;col<=1024;col++){state^=state<<13;state^=state>>>17;state^=state<<5;pixels[row*1025+col]=state&255}
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))])
}
