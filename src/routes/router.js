const router = require('express').Router();
const {jsPDF} = require('jspdf');
const sizeOf = require('image-size');
//const fs = require('fs');
//const path = require('path');
//const multer = require('multer');

//const storage = multer.memoryStorage();
//const upload = multer({ storage:storage });

// router.post('/imagetopdf',upload.array('images'),(req,res)=>{
//     const images = req.files;
//     images.forEach((data)=>{fs.writeFileSync(path.join('uploads', data.originalname), data.buffer)});
//     res.json({status:'ok'});
// })

router.post('/imagetopdf',(req, res) => {
    let chunks = [];
    let totalSize = 0;
    let boundaryIndex = [];
    let imageList = [];
    const boundary = Buffer.from(`--${req.headers['content-type'].split('=')[1]}`);
    req.on('data', (stream) => {
        chunks.push(stream);
        totalSize += stream.length;
    });
    req.on('end', () => {
        const dataBuffer = Buffer.concat(chunks,totalSize);
        for (let i = 0; i < dataBuffer.length - boundary.length + 1; i++){
            let found = true;
            for (let j = 0; j < boundary.length; j++) {
              if (dataBuffer[i + j] !== boundary[j]) {
                found = false;
                break;
              }
            }
            if(found){boundaryIndex.push(i);}
        }
        for(let idx=0;idx<boundaryIndex.length-1;idx++){
            const part = dataBuffer.subarray(boundaryIndex[idx],boundaryIndex[idx+1]);
            const find = Buffer.from("\r\n\r\n");
            const CDIdx = part.indexOf(find);
            const meta = part.subarray(0,CDIdx).toString();
            const fileName = meta.match(/filename="(.+)"/)[1];
            const ext = meta.match(/Content-Type:(.+)/)[1];
            imageList.push([fileName,ext,part.subarray(CDIdx+find.length)]);
        }
        let pdf = new jsPDF('p', 'px', 'a4');
        imageList.forEach((data,idx)=>{
            let page_w = pdf.internal.pageSize.getWidth();
            let page_h = pdf.internal.pageSize.getHeight();
            const dimensions = sizeOf(data[2]);
            let img_w = dimensions.width;
            let img_h = dimensions.height;
            let x = 0;
            let y = 0;
            if(img_w>page_w && img_h>page_w){
                img_w=page_w;
                img_h=page_h;
            }
            else if(img_w>page_w){
                img_w=page_w;
                y=(page_h-img_w)/2;
            }
            else if(img_h>page_h){
                img_h=page_h;
                x=(page_w-img_w)/2;
            }
            else{
                x=(page_w-img_w)/2;
                y=(page_h-img_h)/2;
            }
            idx>0
                ?pdf.addPage('a4','p').addImage(data[2],data[1].split('/')[1].toUpperCase(),x,y,img_w,img_h)
                :pdf.addImage(data[2],data[1].split('/')[1].toUpperCase(),x,y,img_w,img_h)
        });
        
        let out = pdf.output('dataurlstring',{filename:'output.pdf'})
        //res.status(200).json({result:out});
        const chunkSize = 1024;
        const dataLen = `${out.length}<<>>`;
        out = dataLen+out;
        for(let offset = 0; offset < out.length; offset += chunkSize) {
            const chunkData = out.slice(offset, offset + chunkSize);
            res.status(200).write(chunkData);
        }
        res.status(200).end();
    });
});

module.exports = router;