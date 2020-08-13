import { Component, OnInit } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpRequest,
  HttpEventType,
} from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';

@Component({
  templateUrl: './demo2.component.html',
  styleUrls: ['./demo2.component.scss'],
})
export class Demo2Component implements OnInit {
  selectedFile: File;
  name: string;
  uploadPercent: number;
  request: Subscription;
  loading = false;

  constructor(private http: HttpClient) {}
  ngOnInit() {}

  /* Code For Resumable File Upload Start*/
  goToLink(url: string): void {
    window.open(url, '_blank');
  }

  onFileSelect(event): void {
    this.selectedFile = event.target.files[0]; // User selected File
    this.name = this.selectedFile.name;
    console.log(this.selectedFile);
  }

  resumableUpload(): void {
    // checks file id exists or not, checks on name and last modified
    const fileId = `${this.selectedFile.name}-${this.selectedFile.lastModified}`;
    const headers = new HttpHeaders({
      size: this.selectedFile.size.toString(),
      'x-file-id': fileId,
      name: this.name,
    });
    this.loading = true;

    // To know whether file exist or not before making upload
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
          size: this.selectedFile.size.toString(),
          'x-file-id': fileId,
          'x-start-byte': uploadedBytes.toString(),
          name: this.name,
        });
        // Useful for showing animation of Mat Spinner
        const req = new HttpRequest(
          'POST',
          `${environment.api}/upload`,
          this.selectedFile.slice(uploadedBytes, this.selectedFile.size + 1),
          {
            headers: headers2,
            reportProgress: true, // continously fetch data from server of how much file is uploaded
          }
        );
        this.request = this.http.request(req).subscribe(
          (res2: any) => {
            if (
              res2.type === HttpEventType.UploadProgress &&
              this.selectedFile
            ) {
              this.uploadPercent = Math.round(
                (100 * (res2.loaded + uploadedBytes)) / this.selectedFile.size +
                  1
              );
              console.log(this.uploadPercent);
              if (this.uploadPercent >= 100) {
                this.name = '';
                this.selectedFile = null;
                this.loading = false;
              }
            } else {
              console.log(JSON.stringify(res2));
              if (this.uploadPercent >= 100) {
                this.name = '';
                this.selectedFile = null;
                this.loading = false;
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
  }

  stop(): void {
    if (this.request) {
      this.loading = false;
      this.request.unsubscribe();
    }
  }
}
