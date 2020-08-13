import { Component, OnInit } from '@angular/core';
import * as JSZip from 'jszip';
import saveAs from 'file-saver';

interface ZipFile extends JSZip.JSZipObject {
  selected?: boolean;
}
const IGNORED_FILES = ['.DS_Store'];

@Component({
  templateUrl: './demo1.component.html',
  styleUrls: ['./demo1.component.scss'],
})
export class Demo1Component implements OnInit {
  files: ZipFile[] = [];
  zip: JSZip;
  constructor() {}

  ngOnInit(): void {}

  onFileChange(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    this.openZip(files[0]);
  }

  openZip(file: File): void {
    JSZip.loadAsync(file).then((zip) => {
      console.log(zip);
      this.zip = zip;
      this.files = Object.values(zip.files)
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
      this.files.forEach((f) => (f.selected = true));
    });
  }

  simulateUpload(): void {
    this.files
      .filter((f) => !f.selected)
      .forEach((f) => {
        this.zip.remove(f.name);
      });
    this.zip.generateAsync({ type: 'blob' }).then((blob) => {
      saveAs(blob, 'generated.zip');
    });
  }
}
