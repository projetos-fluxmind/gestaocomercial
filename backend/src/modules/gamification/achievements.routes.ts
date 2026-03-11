import { Router } from 'express';
import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';

export const achievementsRouter = Router();

achievementsRouter.get('/companies/:companyId/achievements', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id)
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const result = await pool.query(
      'select id, code, name, description, icon, condition_type, condition_config from achievement_definitions order by code'
    );
    return res.json({ data: result.rows });
  } catch (e) {
    next(e);
  }
});

achievementsRouter.get('/companies/:companyId/achievements/me', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id)
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const result = await pool.query(
      `select ad.id, ad.code, ad.name, ad.description, ad.icon, ua.unlocked_at
       from user_achievements ua
       join achievement_definitions ad on ad.id = ua.achievement_id
       where ua.company_id = $1 and ua.user_id = $2
       order by ua.unlocked_at desc`,
      [companyId, req.auth!.user_id]
    );
    return res.json({ data: result.rows });
  } catch (e) {
    next(e);
  }
});
