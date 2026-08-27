REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE petshop FROM PUBLIC;

SELECT format('CREATE ROLE app_pet LOGIN PASSWORD %L', :'pet_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_pet') \gexec
SELECT format('CREATE ROLE app_agenda LOGIN PASSWORD %L', :'agenda_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_agenda') \gexec
SELECT format('CREATE ROLE app_financeiro LOGIN PASSWORD %L', :'financeiro_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_financeiro') \gexec

CREATE SCHEMA IF NOT EXISTS pet AUTHORIZATION postgres;
CREATE SCHEMA IF NOT EXISTS agenda AUTHORIZATION postgres;
CREATE SCHEMA IF NOT EXISTS financeiro AUTHORIZATION postgres;

CREATE TABLE IF NOT EXISTS pet.pets (
    id uuid PRIMARY KEY,
    tutor_id text NOT NULL,
    nome varchar(100) NOT NULL,
    especie varchar(50) NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pet.servicos (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome varchar(100) NOT NULL UNIQUE,
    descricao text NOT NULL,
    ativo boolean NOT NULL DEFAULT true
);

INSERT INTO pet.servicos (nome, descricao) VALUES
    ('Banho e tosa', 'Higiene e cuidados estéticos para o pet'),
    ('Consulta veterinária', 'Atendimento clínico veterinário'),
    ('Produtos e acessórios', 'Itens selecionados para o bem-estar do pet')
ON CONFLICT (nome) DO NOTHING;

CREATE TABLE IF NOT EXISTS agenda.agendamentos (
    id uuid PRIMARY KEY,
    cliente_id text NOT NULL,
    pet_id uuid NOT NULL,
    servico varchar(100) NOT NULL,
    horario timestamptz NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'agendado',
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financeiro.lancamentos (
    id uuid PRIMARY KEY,
    tipo varchar(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    valor numeric(12,2) NOT NULL CHECK (valor >= 0),
    descricao text NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT CONNECT ON DATABASE petshop TO app_pet, app_agenda, app_financeiro;

GRANT USAGE ON SCHEMA pet TO app_pet;
GRANT SELECT, INSERT ON pet.pets TO app_pet;
GRANT SELECT ON pet.servicos TO app_pet;

GRANT USAGE ON SCHEMA agenda TO app_agenda;
GRANT SELECT, INSERT ON agenda.agendamentos TO app_agenda;

GRANT USAGE ON SCHEMA financeiro TO app_financeiro;
GRANT SELECT ON financeiro.lancamentos TO app_financeiro;

REVOKE ALL ON SCHEMA agenda, financeiro FROM app_pet;
REVOKE ALL ON SCHEMA pet, financeiro FROM app_agenda;
REVOKE ALL ON SCHEMA pet, agenda FROM app_financeiro;

ALTER DEFAULT PRIVILEGES IN SCHEMA pet REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA agenda REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA financeiro REVOKE ALL ON TABLES FROM PUBLIC;
