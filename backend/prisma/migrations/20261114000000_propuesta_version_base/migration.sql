-- Las propuestas anteriores carecen de una base verificable y no se pueden aprobar.
ALTER TABLE "propuestas_cambio" ADD COLUMN "version_base" INTEGER;
