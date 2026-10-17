import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { ResolveFn } from '@angular/router';
const greeting: ResolveFn<{ message: string }> = route => inject(HttpClient).get<{ message: string }>('/api/greet/' + encodeURIComponent(route.paramMap.get('name')!));
export default { title: 'Greeting · FastAng', resolve: { greeting } };
