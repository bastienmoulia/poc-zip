import { Component, OnInit } from '@angular/core';
import * as JSZip from 'jszip';
import saveAs from 'file-saver';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent implements OnInit {

  files: any[] = [];
  zip: JSZip;
  constructor() { }

  ngOnInit(): void {
  }

  onFileChange(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    this.openZip(files[0]);
  }

  openZip(file: File): void {
    JSZip.loadAsync(file).then((zip) => {
      console.log(zip);
      this.zip = zip;
      this.files = Object.values(zip.files);
      this.files.forEach(f => f.selected = true);
    });
  }

  simulateUpload(): void {
    this.files.filter(f => !f.selected).forEach(f => {
      this.zip.remove(f.name);
    });
    this.zip.generateAsync({type: 'blob'}).then((blob) => {
      saveAs(blob, 'generated.zip');
    });
  }
}
