import {Directive, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';

@Directive({
  selector: '[appTimeAgo]'
})
export class TimeAgoDirective implements OnInit, OnDestroy, OnChanges {
  private interval: number;

  @Input()
  appTimeAgo: any;

  constructor(private el: ElementRef) {
  }

  setTime(dateVal: any): void {
    const date = new Date(dateVal);
    this.el.nativeElement.textContent = date;
  }

  ngOnInit(): void {
    this.setTime(this.appTimeAgo);
    // this.interval = window.setInterval(()=>{
    //   this.setTime(this.timeAgo);
    // }, 1000 * 60 * 2);
  }

  ngOnDestroy(): void {
    // if(this.interval){
    //   clearInterval(this.interval);
    // }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.appTimeAgo) {
      this.setTime(changes.appTimeAgo.currentValue);
    }
  }

}
