-- GIN-индекс на JSONB-поле instances для быстрого поиска по soonVipPaymentId
-- и других @>-запросов. Без него isPaymentProcessed() выгружал все серверы
-- и фильтровал в памяти — на 1000+ серверах это медленно (полное сканирование
-- + JSON.parse каждой записи). С jsonb_path_ops индекс O(log n).
--
-- jsonb_path_ops — оптимизированный для оператора @> (containment). Меньше
-- чем стандартный jsonb_ops, но не поддерживает ?/?&/?| операторы (нам не нужны).
CREATE INDEX IF NOT EXISTS "server_instances_gin"
  ON "Server" USING GIN ("instances" jsonb_path_ops);
