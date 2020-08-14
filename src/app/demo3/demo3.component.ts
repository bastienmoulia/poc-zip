import {
  HttpClient,
  HttpHeaders,
  HttpEventType,
  HttpRequest,
} from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as JSZip from 'jszip';
import { environment } from '../../environments/environment';
import blobToHash from 'blob-to-hash';

const IGNORED_FILES = ['.DS_Store'];

@Component({
  selector: 'app-demo3',
  templateUrl: './demo3.component.html',
  styleUrls: ['./demo3.component.scss'],
})
export class Demo3Component implements OnInit {
  zipFiles: JSZip.JSZipObject[] = [];
  file: File;
  zip: JSZip;
  serverFiles: string[] = [];
  uploadPercent: number;
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.getFiles();
  }

  onFileChange(event: Event): void {
    this.file = (event.target as HTMLInputElement).files[0];
    this.openZip(this.file);
  }

  openZip(file: File): void {
    this.loading = true;
    JSZip.loadAsync(file).then((zip) => {
      console.log(zip);
      this.zip = zip;
      this.zipFiles = Object.values(zip.files)
        .filter((f) => !f.dir)
        .filter((f) => {
          let ignore = false;
          IGNORED_FILES.forEach((ignoredFile) => {
            if (f.name.indexOf(ignoredFile) > -1) {
              ignore = true;
            }
          });
          return !ignore;
        });
      this.getDiffFiles();
    });
  }

  getDiffFiles(): void {
    const files = this.zipFiles.map((zipFile) => zipFile.name);
    this.http
      .post(`${environment.api}/diff-files`, files)
      .subscribe((diffFiles: string[]) => {
        console.log('diffFiles', diffFiles);
        this.regenerateZip(diffFiles);
      });
  }

  regenerateZip(files: string[]): void {
    this.zipFiles
      .filter((f) => files.indexOf(f.name) > -1)
      .forEach((f) => {
        this.zip.remove(f.name);
      });
    this.upload();
  }

  upload(): void {
    this.zip.generateAsync({ type: 'blob' }).then((blob) => {
      blobToHash('sha256', blob).then((hash) => {
        console.log(hash);
        const fileId = hash;
        const headers = new HttpHeaders({
          size: blob.size.toString(),
          'x-file-id': fileId,
          name: 'data.zip',
        });
        this.http.get(`${environment.api}/status`, { headers }).subscribe(
          (res: any) => {
            console.log(JSON.stringify(res));
            if (res.status === 'file is present') {
              this.loading = false;
              alert('File is processing...');
              return;
            }
            const uploadedBytes = res.uploaded; // GET response how much file is uploaded
            const headers2 = new HttpHeaders({
              size: blob.size.toString(),
              'x-file-id': fileId,
              'x-start-byte': uploadedBytes.toString(),
              name: 'data.zip',
            });
            // Useful for showing animation of Mat Spinner
            const req = new HttpRequest(
              'POST',
              `${environment.api}/upload`,
              blob.slice(uploadedBytes, blob.size + 1),
              {
                headers: headers2,
                reportProgress: true, // continously fetch data from server of how much file is uploaded
              }
            );
            this.http.request(req).subscribe(
              (res2: any) => {
                if (res2.type === HttpEventType.UploadProgress) {
                  this.uploadPercent = Math.round(
                    (100 * (res2.loaded + uploadedBytes)) / blob.size + 1
                  );
                  console.log(this.uploadPercent);
                  if (this.uploadPercent >= 100) {
                    this.file = null;
                    this.loading = false;
                    this.getFiles();
                  }
                } else {
                  console.log(JSON.stringify(res2));
                  if (this.uploadPercent >= 100) {
                    this.file = null;
                    this.loading = false;
                    this.getFiles();
                  }
                }
              },
              (err) => {
                this.loading = false;
              }
            );
          },
          () => {
            this.loading = false;
          }
        );
      });
    });
  }

  getFiles(): void {
    this.http.get(`${environment.api}/files`).subscribe((files: string[]) => {
      console.log('files', files);
      this.serverFiles = files;
    });
  }

  deleteFiles(): void {
    this.http.delete(`${environment.api}/files`).subscribe(() => {
      this.serverFiles = [];
    });
  }
}
