import { trace, type Tracer } from '@opentelemetry/api';

let _serviceName = 'blindspot';

export function setServiceName(name: string): void {
  _serviceName = name;
}

export function getTracer(): Tracer {
  return trace.getTracer(_serviceName);
}
