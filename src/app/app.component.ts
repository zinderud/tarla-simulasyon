import { Component } from '@angular/core';
import { GridComponent } from './components/grid/grid.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [GridComponent]
})
export class AppComponent {
  title = 'Tarla Simülasyonu';
}
