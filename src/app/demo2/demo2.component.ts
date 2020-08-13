import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import {
  HttpClient,
  HttpHeaders,
  HttpRequest,
  HttpEventType,
} from '@angular/common/http';

@Component({
  templateUrl: './demo2.component.html',
  styleUrls: ['./demo2.component.scss'],
})
export class Demo2Component implements OnInit {
  title = 'resumable-upload-file';

  selectedFile; // Resumable File Upload Variable
  name; // Resumable File Upload Variable
  uploadPercent; // Resumable File Upload Variable
  color = 'primary'; // Mat Spinner Variable (Resumable)
  mode = 'determinate'; // Mat Spinner Variable (Resumable)
  value = 50.25890809809; // Mat Spinner Variable (Resumable)

  constructor(private http: HttpClient, private form: FormBuilder) {}
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

    // To know whether file exist or not before making upload
    this.http
      .get('http://localhost:3000/status', { headers })
      .subscribe((res: any) => {
        console.log(JSON.stringify(res));
        if (res.status === 'file is present') {
          alert('File already exists. Please choose a different file.');
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
          'http://localhost:3000/upload',
          this.selectedFile.slice(uploadedBytes, this.selectedFile.size + 1),
          {
            headers: headers2,
            reportProgress: true, // continously fetch data from server of how much file is uploaded
          }
        );
        this.http.request(req).subscribe(
          (res: any) => {
            if (res.type === HttpEventType.UploadProgress) {
              this.uploadPercent = Math.round((100 * res.loaded) / res.total);
              console.log(this.uploadPercent);
              if (this.uploadPercent >= 100) {
                this.name = '';
                this.selectedFile = null;
              }
            } else {
              console.log(JSON.stringify(res));
              if (this.uploadPercent >= 100) {
                this.name = '';
                this.selectedFile = null;
              }
            }
          },
          (err) => {}
        );
      });
  }
}
