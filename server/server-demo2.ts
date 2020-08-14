const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(3000, () => {
  console.log('Started in 3000');
});

let uploads = {};

const folder = 'server/temp';

app.post('/upload', (req, res, next) => {
  const fileId = req.headers['x-file-id'];
  const startByte = parseInt(req.headers['x-start-byte'], 10);
  const name = req.headers.name;
  const fileSize = parseInt(req.headers.size, 10);
  console.log('file Size', fileSize, fileId, startByte);
  if (uploads[fileId] && fileSize === uploads[fileId].bytesReceived) {
    res.end();
    return;
  }

  console.log(fileSize);

  if (!fileId) {
    res.writeHead(400, 'No file id');
    res.end(400);
  }
  console.log(uploads[fileId]);
  if (!uploads[fileId]) {
    uploads[fileId] = {};
  }

  const upload = uploads[fileId]; // Bytes of file already present

  let fileStream;
  // create folder if not exist
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }

  // checking bytes of file uploaded and sending to server
  if (!startByte) {
    upload.bytesReceived = 0;
    fileStream = fs.createWriteStream(`./${folder}/${name}`, {
      flags: 'w', // with "w"(write stream ) it keeps on adding data
    });
  } else {
    if (upload.bytesReceived !== startByte) {
      // if same name file is sent with different size it will not upload
      res.writeHead(400, 'Wrong start byte');
      res.end(upload.bytesReceived);
      return;
    }
    // append to existing file
    fileStream = fs.createWriteStream(`./${folder}/${name}`, {
      flags: 'a',
    });
  }

  req.on('data', (data) => {
    upload.bytesReceived += data.length; // adding length of data we are adding
  });

  req.pipe(fileStream);

  // when the request is finished, and all its data is written
  fileStream.on('close', () => {
    console.log(upload.bytesReceived, fileSize);
    if (upload.bytesReceived === fileSize) {
      console.log('Upload finished');
      delete uploads[fileId];

      // can do something else with the uploaded file here
      res.send({ status: 'uploaded' });
      res.end();

      processFile(name);
    } else {
      // connection lost, leave the unfinished file around
      console.log('File unfinished, stopped at ' + upload.bytesReceived);
      res.writeHead(500, 'Server Error');
      res.end();
    }
  });

  // in case of I/O error - finish the request
  fileStream.on('error', (err) => {
    console.log('fileStream error', err);
    res.writeHead(500, 'File error');
    res.end();
  });
});

app.get('/', (req, res) => {
  res.send(
    `<h1 style='text-align: center'>
            Upload File Backend
            <br><br>
            <b style="font-size: 182px;">Working</b>
        </h1>`
  );
});

app.get('/status', (req, res) => {
  // console.log('Successfully came');
  // From GET request 3 parameters below and store in variable
  const fileId = req.headers['x-file-id'];
  const name = req.headers.name;
  const fileSize = parseInt(req.headers.size, 10);
  console.log(name);
  if (name) {
    try {
      const stats = fs.statSync(`${folder}/${name}`); // grabs file information and returns
      // checking file exists or not
      if (stats.isFile()) {
        console.log(
          `fileSize is ${fileSize} and already uploaded file size ${stats.size}`
        );
        if (fileSize === stats.size) {
          res.send({ status: 'file is present' }); // returns if file exists
          return;
        }
        if (!uploads[fileId]) {
          uploads[fileId] = {};
        }
        console.log(uploads[fileId]);
        uploads[fileId].bytesReceived = stats.size; // checks total amount of file uploaded
        console.log(uploads[fileId], stats.size);
      }
    } catch (er) {}
  }
  const upload = uploads[fileId];
  if (upload) {
    res.send({ uploaded: upload.bytesReceived });
  } // returns to FrontEnd amout of bytes uploaded
  else {
    res.send({ uploaded: 0 });
  }
});

function processFile(name: string): void {
  // TODO: process the file and delete it from temp
  setTimeout(() => {
    fs.unlink(`./${folder}/${name}`, () => {
      console.log(`File ${name} deleted`);
    });
  }, 10000);
}
