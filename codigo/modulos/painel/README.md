# Dashboard

Controller, service e repository implementam pendências, pagamentos do mês, tarefas abertas, membros ativos e próximas contas.

O service coordena os indicadores e o repository consulta agregações reais do banco, filtradas pela república autorizada. Valores monetários são retornados como strings decimais. Indicadores que precisam representar o mesmo instante são lidos em uma única transação.
