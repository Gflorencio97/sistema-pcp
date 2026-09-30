from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


# Operações fixas da fábrica (baseadas no Excel)
OPERACOES_FABRICA = [
    {"codigo": "USINAGEM",    "nome": "Usinagem",                "ordem": 1},
    {"codigo": "FUR_INC",     "nome": "Furação Incremental",     "ordem": 2},
    {"codigo": "FUR_07",      "nome": "Furação 0,7",             "ordem": 3},
    {"codigo": "BRUNIMENTO",  "nome": "Brunimento",              "ordem": 4},
    {"codigo": "ROLETAMENTO", "nome": "Roletamento",             "ordem": 5},
    {"codigo": "LAV_INSP",    "nome": "Lavagem / Inspeção",      "ordem": 6},
]


class StatusMaquina(str, enum.Enum):
    ATIVA = "ativa"
    MANUTENCAO = "manutencao"
    INATIVA = "inativa"


class StatusOrdem(str, enum.Enum):
    PLANEJADA = "planejada"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDA = "concluida"
    CANCELADA = "cancelada"
    PAUSADA = "pausada"


class PrioridadeOrdem(str, enum.Enum):
    BAIXA = "baixa"
    NORMAL = "normal"
    ALTA = "alta"
    URGENTE = "urgente"


class Maquina(Base):
    __tablename__ = "maquinas"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nome = Column(String(150), nullable=False)
    descricao = Column(Text, nullable=True)
    setor = Column(String(100), nullable=True)
    operacao_codigo = Column(String(50), nullable=True, comment="Tipo de operação (USINAGEM, FUR_INC, etc.)")
    horas_por_dia = Column(Float, default=17.15, comment="Horas disponíveis de produção por dia")
    capacidade_hora = Column(Float, nullable=True, comment="Capacidade produtiva por hora")
    status = Column(Enum(StatusMaquina, values_callable=lambda x: [e.value for e in x]), default=StatusMaquina.ATIVA, nullable=False)
    turno_manha = Column(Boolean, default=True)
    turno_tarde = Column(Boolean, default=True)
    turno_noite = Column(Boolean, default=False)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    ordens = relationship("OrdemProducao", back_populates="maquina")



class Produto(Base):
    __tablename__ = "produtos"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    codigo_fundido = Column(String(50), nullable=True, comment="Código da matéria-prima fundida")
    unidade_medida = Column(String(20), default="UN")
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    ordens = relationship("OrdemProducao", back_populates="produto")
    roteiro = relationship("RoteiroProduto", back_populates="produto", cascade="all, delete-orphan")


class RoteiroProduto(Base):
    """Tempo de produção por operação para cada produto.
    Cada linha = 1 operação do roteiro de um produto.
    pcs_hora: capacidade da operação (peças por hora).
    Tempo por peça = 1 / pcs_hora (em horas).
    """
    __tablename__ = "roteiro_produto"
    __table_args__ = (
        UniqueConstraint("produto_id", "operacao_codigo", name="uq_roteiro_produto_operacao"),
    )

    id = Column(Integer, primary_key=True, index=True)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    operacao_codigo = Column(String(20), nullable=False, comment="Código da operação (ex: USINAGEM)")
    operacao_nome = Column(String(100), nullable=False, comment="Nome legível da operação")
    ordem = Column(Integer, nullable=False, default=1, comment="Sequência da operação")
    pcs_hora = Column(Float, nullable=True, comment="Capacidade: peças por hora")
    maquina_id = Column(Integer, ForeignKey("maquinas.id"), nullable=True, comment="Máquina/Linha padrão para esta etapa")
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    produto = relationship("Produto", back_populates="roteiro")
    maquina = relationship("Maquina")





class OrdemProducao(Base):
    __tablename__ = "ordens_producao"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String(50), unique=True, nullable=False, index=True)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    maquina_id = Column(Integer, ForeignKey("maquinas.id"), nullable=True)
    quantidade_planejada = Column(Float, nullable=False)
    quantidade_produzida = Column(Float, default=0)
    status = Column(Enum(StatusOrdem, values_callable=lambda x: [e.value for e in x]), default=StatusOrdem.PLANEJADA, nullable=False)
    prioridade = Column(Enum(PrioridadeOrdem, values_callable=lambda x: [e.value for e in x]), default=PrioridadeOrdem.NORMAL, nullable=False)
    data_inicio_planejada = Column(DateTime(timezone=True), nullable=True)
    data_fim_planejada = Column(DateTime(timezone=True), nullable=True)
    data_inicio_real = Column(DateTime(timezone=True), nullable=True)
    data_fim_real = Column(DateTime(timezone=True), nullable=True)
    observacoes = Column(Text, nullable=True)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    produto = relationship("Produto", back_populates="ordens")
    maquina = relationship("Maquina", back_populates="ordens")
