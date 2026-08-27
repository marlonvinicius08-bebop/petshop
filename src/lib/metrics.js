export class Metrics {
  constructor(service) {
    this.service = service;
    this.requests = new Map();
  }

  record(method, status) {
    const key = `${method}:${status}`;
    this.requests.set(key, (this.requests.get(key) ?? 0) + 1);
  }

  render() {
    const lines = [
      '# HELP petshop_http_requests_total Total de requisições HTTP.',
      '# TYPE petshop_http_requests_total counter',
    ];
    for (const [key, count] of this.requests) {
      const [method, status] = key.split(':');
      lines.push(`petshop_http_requests_total{service="${this.service}",method="${method}",status="${status}"} ${count}`);
    }
    return `${lines.join('\n')}\n`;
  }
}

