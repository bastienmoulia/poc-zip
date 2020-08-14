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
import { ToastrService } from 'ngx-toastr';

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

  constructor(private http: HttpClient, private toastrService: ToastrService) {}

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
    this.http.post(`${environment.api}/diff-files`, files).subscribe(
      (diffFiles: string[]) => {
        console.log('diffFiles', diffFiles);
        if (diffFiles.length > 0) {
          this.toastrService.info(
            `${diffFiles.length} files in the zip to upload`,
            `Diff files`
          );
          this.regenerateZip(diffFiles);
        } else {
          this.loading = false;
          this.toastrService.success(
            `No file in the zip to upload`,
            `Diff files`
          );
        }
      },
      () => {
        this.toastrService.error(`Error`, `Diff files`);
      }
    );
  }

  regenerateZip(files: string[]): void {
    this.zipFiles
      .filter((f) => files.indexOf(f.name) === -1)
      .forEach((f) => {
        console.log('remove from zip :', f.name);
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
          name: `${fileId.substring(0, 10)}.zip`,
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
              name: `${fileId.substring(0, 10)}.zip`,
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
                  if (this.uploadPercent >= 100 && this.loading) {
                    this.toastrService.success(`Upload completed`, `Upload`);
                    this.reset();
                  }
                } else {
                  console.log(JSON.stringify(res2));
                  if (this.uploadPercent >= 100 && this.loading) {
                    this.toastrService.success(`Upload completed`, `Upload`);
                    this.reset();
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

  reset() {
    this.uploadPercent = 0;
    this.file = null;
    this.loading = false;
    this.zipFiles = [];
    this.zip = null;
  }

  getFiles(): void {
    this.http.get(`${environment.api}/files`).subscribe(
      (files: string[]) => {
        console.log('files', files);
        this.serverFiles = files;
      },
      () => {
        this.toastrService.error(`Error`, `Get files`);
      }
    );
  }

  deleteFiles(): void {
    this.http.delete(`${environment.api}/files`).subscribe(
      () => {
        this.serverFiles = [];
      },
      () => {
        this.toastrService.error(`Error`, `Delete files`);
      }
    );
  }

  deleteFile(name: string): void {
    this.http.delete(`${environment.api}/file?name=${name}`).subscribe(
      () => {
        this.serverFiles.splice(this.serverFiles.indexOf(name), 1);
      },
      () => {
        this.toastrService.error(`Error`, `Delete file`);
      }
    );
  }
}
