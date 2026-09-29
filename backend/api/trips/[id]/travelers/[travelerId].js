import { db } from "hatchable";
export const access="public";
export const methods=["PUT"];
export default async function(req,res){const tripId=req.params.id,travelerId=req.params.travelerId;try{const name=String((req.body||{}).name||"").trim().slice(0,80);if(!name)return res.status(400).json({error:"Traveler name is required."});const r=await db.query("UPDATE travelers SET name=$1 WHERE id=$2 AND trip_id=$3 RETURNING id,name,position",[name,travelerId,tripId]);if(!r.rows.length)return res.status(404).json({error:"Traveler not found."});await db.query("UPDATE trips SET updated_at=now() WHERE id=$1",[tripId]);res.json({traveler:r.rows[0]})}catch(e){res.status(500).json({error:"Unable to update traveler."})}}
