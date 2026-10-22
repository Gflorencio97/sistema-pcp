import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Plus, UserCheck, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { authService } from '../services/authService';
import { useAuth } from '../auth/AuthContext';
import { mensagemDeErro } from './Login';
import type { Usuario, UsuarioComSenha } from '../types';

const PERFIS: { valor: string; rotulo: string; descricao: string }[] = [
  { valor: 'admin', rotulo: 'Administrador', descricao: 'Acesso total, inclusive usuários e auditoria' },
  { valor: 'editor', rotulo: 'Editor (PCP)', descricao: 'Cria e edita produtos, máquinas, roteiros e ordens' },
  { valor: 'visualizador', rotulo: 'Visualizador', descricao: 'Somente consulta (fábrica e diretoria)' },
];
const COR_PERFIL: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  editor: 'bg-blue-100 text-blue-700',
  visualizador: 'bg-gray-100 text-gray-600',
};

function CaixaSenha({ titulo, dados, onFechar }: { titulo: string; dados: UsuarioComSenha; onFechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(dados.senha_temporaria ?? '');
      setCopiado(true);
    } catch {
      /* sem permissao para copiar: a senha esta na tela */
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
        <p className="mt-1 text-sm text-gray-600">
          Usuário <strong>{dados.login}</strong>. Anote e entregue a senha provisória agora: ela <strong>não aparece de novo</strong>.
          No primeiro acesso a pessoa será obrigada a trocá-la.
        </p>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <code className="select-all text-lg font-bold tracking-wider text-amber-900">{dados.senha_temporaria}</code>
          <button onClick={copiar} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <Copy className="h-3.5 w-3.5" /> {copiado ? 'Copiada' : 'Copiar'}
          </button>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={onFechar} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Já anotei</button>
        </div>
      </div>
    </div>
  );
}

export default function Usuarios() {
  const qc = useQueryClient();
  const { usuario: eu } = useAuth();
  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState({ nome: '', login: '', perfil: 'visualizador', senha: '' });
  const [erro, setErro] = useState('');
  const [senhaGerada, setSenhaGerada] = useState<{ titulo: string; dados: UsuarioComSenha } | null>(null);

  const { data: usuarios = [], isLoading } = useQuery({ queryKey: ['usuarios'], queryFn: authService.listarUsuarios });

  const criar = useMutation({
    mutationFn: () => authService.criarUsuario({
      nome: form.nome.trim(), login: form.login.trim().toLowerCase(), perfil: form.perfil, senha: form.senha || undefined,
    }),
    onSuccess: dados => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      setModalNovo(false);
      setForm({ nome: '', login: '', perfil: 'visualizador', senha: '' });
      setSenhaGerada({ titulo: 'Usuário criado', dados });
    },
    onError: e => setErro(mensagemDeErro(e, 'Não foi possível criar o usuário.')),
  });

  const atualizar = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { perfil?: string; ativo?: boolean } }) => authService.atualizarUsuario(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
    onError: e => alert(mensagemDeErro(e, 'Não foi possível alterar o usuário.')),
  });

  const redefinir = useMutation({
    mutationFn: (id: number) => authService.redefinirSenha(id),
    onSuccess: dados => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      setSenhaGerada({ titulo: 'Senha redefinida', dados });
    },
    onError: e => alert(mensagemDeErro(e, 'Não foi possível redefinir a senha.')),
  });

  const entrada = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500">Quem acessa o sistema e o que cada perfil pode fazer.</p>
        </div>
        <button onClick={() => { setErro(''); setModalNovo(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Novo usuário
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {PERFIS.map(p => (
          <div key={p.valor} className="rounded-xl border border-gray-100 bg-white p-3 text-xs text-gray-600 shadow-sm">
            <span className={`mb-1 inline-block rounded-full px-2 py-0.5 font-semibold ${COR_PERFIL[p.valor]}`}>{p.rotulo}</span>
            <div>{p.descricao}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Login</th>
              <th className="px-4 py-3 font-semibold">Perfil</th>
              <th className="px-4 py-3 font-semibold">Situação</th>
              <th className="px-4 py-3 font-semibold">Último acesso</th>
              <th className="px-4 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Carregando...</td></tr>
            ) : usuarios.map((u: Usuario) => {
              const sou_eu = u.id === eu?.id;
              return (
                <tr key={u.id} className={u.ativo ? '' : 'bg-gray-50 text-gray-400'}>
                  <td className="px-4 py-3 font-medium">{u.nome}{sou_eu && <span className="ml-2 text-[10px] text-blue-600">(você)</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs">{u.login}</td>
                  <td className="px-4 py-3">
                    <select value={u.perfil} disabled={sou_eu || atualizar.isPending}
                      onChange={e => atualizar.mutate({ id: u.id, data: { perfil: e.target.value } })}
                      className={`rounded-full border-0 px-2 py-1 text-xs font-semibold ${COR_PERFIL[u.perfil]} disabled:opacity-70`}>
                      {PERFIS.map(p => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {!u.ativo ? 'Desativado' : u.deve_trocar_senha ? 'Aguardando troca de senha' : 'Ativo'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {u.ultimo_acesso ? format(new Date(u.ultimo_acesso), 'dd/MM/yyyy HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {!sou_eu && (
                        <button title="Redefinir senha" disabled={redefinir.isPending}
                          onClick={() => { if (confirm(`Redefinir a senha de ${u.nome}? Os acessos abertos dele serão encerrados.`)) redefinir.mutate(u.id); }}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600">
                          <KeyRound className="h-4 w-4" />
                        </button>
                      )}
                      {!sou_eu && (
                        <button title={u.ativo ? 'Desativar' : 'Reativar'}
                          onClick={() => atualizar.mutate({ id: u.id, data: { ativo: !u.ativo } })}
                          className={`rounded p-1.5 text-gray-400 hover:bg-gray-100 ${u.ativo ? 'hover:text-red-600' : 'hover:text-emerald-600'}`}>
                          {u.ativo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={e => { e.preventDefault(); setErro(''); criar.mutate(); }} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Novo usuário</h2>
            <label className="block"><span className="mb-1 block text-xs font-medium text-gray-600">Nome completo</span>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required minLength={2} maxLength={150} className={entrada} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-gray-600">Login (minúsculas, números, ponto, hífen)</span>
              <input value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value.toLowerCase() }))} required minLength={3} maxLength={50} pattern="[a-z0-9._-]{3,50}" className={entrada} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-gray-600">Perfil</span>
              <select value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))} className={entrada}>
                {PERFIS.map(p => <option key={p.valor} value={p.valor}>{p.rotulo} — {p.descricao}</option>)}
              </select></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-gray-600">Senha provisória (deixe em branco para gerar)</span>
              <input type="text" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} maxLength={64} autoComplete="off" className={entrada} /></label>
            {erro && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalNovo(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={criar.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">Criar</button>
            </div>
          </form>
        </div>
      )}

      {senhaGerada && <CaixaSenha titulo={senhaGerada.titulo} dados={senhaGerada.dados} onFechar={() => setSenhaGerada(null)} />}
    </div>
  );
}
