import { db } from "hatchable";
export const access="public";
export const methods=["GET"];
export default async function(req,res){try{const r=await db.query("SELECT t.id,t.name,t.share_code,t.created_at,t.updated_at,COUNT(DISTINCT e.id) AS expense_count,COALESCE(SUM(e.amount),0) AS total FROM trips t LEFT JOIN expenses e ON e.trip_id=t.id GROUP BY t.id ORDER BY t.updated_at DESC,t.created_at DESC");res.json({trips:r.rows.map(t=>({...t,expense_count:Number(t.expense_count),total:Number(t.total)}))})}catch(e){res.status(500).json({error:"Unable to load trip history."})}}
