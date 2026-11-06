import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseAllDocuments } from 'yaml';

/* Spójność manifestów Kubernetes (bez klastra): selektory, porty, utwardzenie kontenerów. */

const dir = join(__dirname);
type Doc = { kind: string; metadata: { name: string }; spec: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const parse = (file: string): Doc[] =>
  parseAllDocuments(readFileSync(join(dir, file), 'utf8')).map((d) => {
    if (d.errors.length) throw d.errors[0];
    return d.toJSON() as Doc;
  });

const kustomization = parse('kustomization.yaml')[0] as unknown as { resources: string[]; images: { name: string }[] };
const docs = new Map<string, Doc>();
for (const f of [...kustomization.resources, 'ingressroute.example.yaml', 'secret.example.yaml']) {
  for (const d of parse(f)) docs.set(`${d.kind}/${d.metadata.name}`, d);
}
const dep = docs.get('Deployment/sds-app')!;
const job = docs.get('Job/sds-seed')!;
const svc = docs.get('Service/sds-app')!;
const pod = dep.spec.template;
const matches = (selector: Record<string, string>, labels: Record<string, string>) =>
  Object.entries(selector).every(([k, v]) => labels[k] === v);

describe('manifesty Kubernetes', () => {
  it('wszystkie zasoby kustomizacji się parsują', () => {
    expect(docs.size).toBeGreaterThanOrEqual(kustomization.resources.length);
  });

  it('selektory Deploymentu, Service i PDB wskazują pody aplikacji', () => {
    expect(matches(dep.spec.selector.matchLabels, pod.metadata.labels)).toBe(true);
    expect(matches(svc.spec.selector, pod.metadata.labels)).toBe(true);
    expect(matches(docs.get('PodDisruptionBudget/sds-app')!.spec.selector.matchLabels, pod.metadata.labels)).toBe(true);
  });

  it('Service kieruje na nazwany port kontenera, IngressRoute na Service', () => {
    expect(svc.spec.ports[0].targetPort).toBe(pod.spec.containers[0].ports[0].name);
    expect(docs.get('IngressRoute/sds-app')!.spec.routes[0].services[0]).toEqual({ name: 'sds-app', port: 'http' });
  });

  it('każdy kontener jest utwardzony i używa obrazu z kustomizacji', () => {
    const containers = [pod.spec, job.spec.template.spec].flatMap((s) => [...(s.initContainers ?? []), ...s.containers]);
    expect(containers.length).toBe(4);
    for (const c of containers) {
      expect(c.image, c.name).toBe(kustomization.images[0].name);
      expect(c.securityContext).toMatchObject({ readOnlyRootFilesystem: true, allowPrivilegeEscalation: false, capabilities: { drop: ['ALL'] } });
    }
    expect(pod.spec.securityContext.runAsNonRoot).toBe(true);
  });

  it('montowania wskazują zdefiniowane wolumeny (zapisywalne /tmp i cache Next.js)', () => {
    const volumes = new Set(pod.spec.volumes.map((v: { name: string }) => v.name));
    const mounts = [...pod.spec.initContainers, ...pod.spec.containers].flatMap((c: { volumeMounts: { name: string }[] }) => c.volumeMounts);
    expect(mounts.every((m: { name: string }) => volumes.has(m.name))).toBe(true);
    expect(pod.spec.containers[0].volumeMounts.map((m: { mountPath: string }) => m.mountPath)).toEqual(['/tmp', '/app/.next/cache']);
  });

  it('wdrożenie bez przestojów: maxUnavailable 0, PDB < liczby replik, sondy zdrowia', () => {
    expect(dep.spec.strategy.rollingUpdate.maxUnavailable).toBe(0);
    expect(docs.get('PodDisruptionBudget/sds-app')!.spec.minAvailable).toBeLessThan(dep.spec.replicas);
    const web = pod.spec.containers[0];
    expect(web.readinessProbe.httpGet.path).toBe('/api/health?ready=1');
    expect(web.livenessProbe.httpGet.path).toBe('/api/health');
  });

  it('migracje uruchamia initContainer (aplikacja i seed)', () => {
    expect(pod.spec.initContainers[0].command).toEqual(['migrate']);
    expect(job.spec.template.spec.initContainers[0].command).toEqual(['migrate']);
  });
});
