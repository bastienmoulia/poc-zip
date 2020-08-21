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
  entries: any[] = [];
  file: File;
  constructor() {}

  ngOnInit(): void {}

  onFileChange(event: Event): void {
    this.file = (event.target as HTMLInputElement).files[0];
    // this.openZip(this.file);
    this.openZip2(this.file);
  }

  openZip(file: File): void {
    JSZip.loadAsync(file).then((zip) => {
      console.log(zip);
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

  openZip2(file: File): void {
    (window as any).zip.workerScriptsPath = 'assets/';
    (window as any).zip.createReader(
      new (window as any).zip.BlobReader(file),
      (reader) => {
        reader.getEntries((entries) => {
          this.entries = entries
            .filter((entry) => !entry.directory)
            .filter((entry) => {
              let ignore = false;
              IGNORED_FILES.forEach((ignoredFile) => {
                if (entry.filename.indexOf(ignoredFile) > -1) {
                  ignore = true;
                }
              });
              return !ignore;
            });
          this.entries.forEach((e) => (e.selected = true));
          console.log(this.entries);
        });
      }
    );
  }

  simulateUpload(): void {
    JSZip.loadAsync(this.file).then((zip) => {
      if (this.files.length > 0) {
        this.files
          .filter((f) => !f.selected)
          .forEach((f) => {
            zip.remove(f.name);
          });
      }
      if (this.entries.length > 0) {
        this.entries
          .filter((e) => !e.selected)
          .forEach((e) => {
            zip.remove(e.filename);
          });
      }
      zip.generateAsync({ type: 'blob' }).then((blob) => {
        saveAs(blob, 'generated.zip');
      });
    });
  }
}
