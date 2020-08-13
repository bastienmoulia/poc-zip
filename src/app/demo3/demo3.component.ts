import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as JSZip from 'jszip';
import { environment } from '../../environments/environment';

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
  constructor(private http: HttpClient) {}

  ngOnInit(): void {}

  onFileChange(event: Event): void {
    this.file = (event.target as HTMLInputElement).files[0];
    this.openZip(this.file);
  }

  openZip(file: File): void {
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

  getDiffFiles() {
    this.http
      .post(`${environment.api}/diff-files`, this.zipFiles)
      .subscribe((diffFiles) => {
        console.log('diffFiles', diffFiles);
      });
  }

  getFiles() {
    this.http.get(`${environment.api}/files`).subscribe((files) => {
      console.log('files', files);
    });
  }
}
