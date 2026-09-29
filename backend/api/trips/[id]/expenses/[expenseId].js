import { db } from "hatchable";
export const access="public";
export const methods=["DELETE"];
export default async function(req,res){const tripId=req.params.id,expenseId=req.params.expenseId;try{const r=await db.query("DELETE FROM expenses WHERE id=$1 AND trip_id=$2 RETURNING id",[expenseId,tripId]);if(!r.rows.length)return res.status(404).json({error:"Expense not found."});await db.query("UPDATE trips SET updated_at=now() WHERE id=$1",[tripId]);res.json({success:true,deleted_expense_id:r.rows[0].id})}catch(e){res.status(500).json({error:"Unable to delete expense."})}}
