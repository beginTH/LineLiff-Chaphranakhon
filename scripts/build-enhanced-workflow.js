const fs = require('fs');
const path = require('path');
const input = path.resolve('outputs/n8n_workflow_chaphranakhon_vat_fields_fixed.json');
const output = path.resolve('outputs/n8n_workflow_chaphranakhon_admin_adjustment_history.json');
const w = JSON.parse(fs.readFileSync(input, 'utf8'));
const node = (name) => { const n=w.nodes.find(x=>x.name===name); if(!n) throw new Error(name); return n; };
const addColumn = (name, id) => {
  const n=node(name), cols=n.parameters.columns;
  if (!(id in cols.value)) cols.value[id]='';
  if (!cols.schema.some(x=>x.id===id)) cols.schema.push({id,displayName:id,required:false,defaultMatch:false,display:true,type:'string',canBeUsedToMatch:true});
};

node('Format Profile Response').parameters.jsCode = `const uid = String($node['GET /get-user-profile'].json.query?.uid || '').trim();
const rows = $input.all().map(item => item.json);
const row = rows.find(item => String(item.LINE_UID || '').trim() === uid);
if (!row) return [{ json: { uid, displayName: '', addresses: [] } }];
const addresses = [1,2,3,4,5].map(num => ({
  id: 'addr-' + num,
  label: row['Address_Label_' + num] || row.Branch_Name || ('ที่อยู่ ' + num),
  text: row['Address_' + num] || '',
  contactName: row['Contact_Name_' + num] || row.Contact_Name || row.Display_Name || '',
  tel: row.Tel || '',
})).filter(item => item.text);
return [{ json: { uid, displayName: row.Display_Name || row.Branch_Name || '', branchName: row.Branch_Name || '', addresses } }];`;

node('Build Address Update Row').parameters.jsCode = `function parseJson(v,f){try{return v?JSON.parse(v):f}catch{return f}}
const order=$node['Build Order Row'].json;
const details=parseJson(order.Order_Details,{});
const address=parseJson(order.Delivery_Address,{});
const rows=$input.all().map(item=>item.json);
const row=rows.find(r=>String(r.LINE_UID||'').trim()===String(order.LINE_UID||'').trim())||{};
const update={LINE_UID:order.LINE_UID,Display_Name:row.Display_Name||details.displayName||'',Branch_Name:row.Branch_Name||address.label||details.displayName||'',Opening:row.Opening||'',Tel:String(address.tel||row.Tel||'').trim(),Contact_Name:row.Contact_Name||address.contactName||details.displayName||''};
for(const num of [1,2,3,4,5]){update['Address_'+num]=row['Address_'+num]||'';update['Address_Label_'+num]=row['Address_Label_'+num]||'';update['Contact_Name_'+num]=row['Contact_Name_'+num]||'';}
const newText=String(address.text||'').trim();
if(details.isNewAddress&&newText){let num=[1,2,3,4,5].find(n=>String(update['Address_'+n]||'').trim()===newText);if(!num)num=[1,2,3,4,5].find(n=>!String(update['Address_'+n]||'').trim());if(num){update['Address_'+num]=newText;update['Address_Label_'+num]=address.label||update.Branch_Name||('ที่อยู่ '+num);update['Contact_Name_'+num]=address.contactName||details.displayName||'';}}
return [{json:update}];`;
for(const id of ['Contact_Name','Contact_Name_1','Contact_Name_2','Contact_Name_3','Contact_Name_4','Contact_Name_5']){addColumn('Update User Address',id);node('Update User Address').parameters.columns.value[id]=`={{ $json.${id} }}`;}

node('Format Order Response').parameters.jsCode = `function parseJson(v,f){try{return v?JSON.parse(v):f}catch{return f}}
const orderId=String($node['GET /get-order'].json.query?.orderId||'').trim();
const row=$input.all().map(i=>i.json).find(r=>String(r.Order_ID||'').trim()===orderId);
if(!row)return[{json:{success:false,message:'Order not found',orderId}}];
const deliveryAddress=parseJson(row.Delivery_Address,{}),details=parseJson(row.Order_Details,{});
return[{json:{orderId:row.Order_ID,timestamp:row.Timestamp,status:row.Status||'Pending',branchInfo:{uid:row.LINE_UID||'',displayName:details.displayName||row.LINE_UID||''},deliveryAddress,orderItems:details.orderItems||[],subtotal:Number(row.Subtotal||0),shippingCost:Number(row.Shipping_Cost||0),discount:Number(row.Discount||0),otherFee:Number(row.Other_Fee||0),vatAmount:Number(row.VAT_Amount||0),totalAmount:Number(row.Total_Amount||0),note:details.note||'',adjustmentReason:row.Adjustment_Reason||'',approvalHistory:parseJson(row.Approval_History,[]),approvedBy:row.Approved_By||'',approvedAt:row.Approved_At||''}}];`;

node('Build Approval Row').parameters.jsCode = `const body=$json.body||$json;
const sourceItems=Array.isArray(body.adjustedOrderItems)?body.adjustedOrderItems:[];
const adjustedItems=sourceItems.map(item=>{const originalQuantity=Number(item.originalQuantity??item.quantity??0);const quantity=Math.min(originalQuantity,Math.max(0,Math.floor(Number(item.quantity)||0)));const pricePerUnit=Number(item.pricePerUnit||0);return{...item,originalQuantity,quantity,pricePerUnit,lineTotal:Number((quantity*pricePerUnit).toFixed(2))};});
const subtotal=Number(adjustedItems.reduce((sum,item)=>sum+item.lineTotal,0).toFixed(2));
const shippingCost=Number(body.shippingCost||0),discount=Number(body.discount||0),otherFee=Number(body.otherFee||0);
const amountBeforeVat=Math.max(0,subtotal+shippingCost+otherFee-discount),vatAmount=Number((amountBeforeVat*0.07).toFixed(2)),totalAmount=Number((amountBeforeVat+vatAmount).toFixed(2));
const authorizedAdmin=body.authorizedAdmin||{},approvedAt=body.approvedAt||new Date().toISOString();
const adminUid=body.adminUid||'',adminName=authorizedAdmin.Display_Name||authorizedAdmin.Admin_ID||adminUid,adminRole=authorizedAdmin.Role||'';
const previous=Array.isArray(body.approvalHistory)?body.approvalHistory:[];
const history=[...previous,{action:'APPROVED',adminUid,adminName,adminRole,approvedAt,adjustmentReason:body.adjustmentReason||'',adminNote:body.adminNote||'',items:adjustedItems.map(i=>({productId:i.productId,originalQuantity:i.originalQuantity,approvedQuantity:i.quantity}))}];
const originalDetails=body.orderDetails&&typeof body.orderDetails==='object'?body.orderDetails:{};
return[{json:{Order_ID:body.orderId,Branch_UID:body.branchUid||'',Order_Details:JSON.stringify({...originalDetails,displayName:body.branchDisplayName||'',orderItems:adjustedItems,note:body.orderNote||''}),Subtotal:subtotal,Shipping_Cost:shippingCost,Discount:discount,Other_Fee:otherFee,VAT_Amount:vatAmount,Total_Amount:totalAmount,Status:'Approved',Admin_Note:body.adminNote||'',Adjustment_Reason:body.adjustmentReason||'',Approved_By_UID:adminUid,Approved_By:adminName,Approved_At:approvedAt,Approval_History:JSON.stringify(history)}}];`;

for(const id of ['Adjustment_Reason','Approved_By_UID','Approval_History']) addColumn('Save New Order',id);
for(const id of ['Order_Details','Subtotal','Adjustment_Reason','Approved_By_UID','Approval_History']) addColumn('Update Shipping & Status',id);
Object.assign(node('Update Shipping & Status').parameters.columns.value,{
  Order_Details:"={{ $json.Order_Details }}",Subtotal:"={{ $json.Subtotal }}",Adjustment_Reason:"={{ $json.Adjustment_Reason }}",Approved_By_UID:"={{ $json.Approved_By_UID }}",Approval_History:"={{ $json.Approval_History }}"
});
for(const id of ['Adjustment_Reason','Approved_By_UID','Approval_History']) node('Save New Order').parameters.columns.value[id]='';

node('Approve Response').parameters.jsCode = `const a=$node['Build Approval Row'].json,p=$node['Build PDF URL'].json;return[{json:{success:true,orderId:a.Order_ID,status:a.Status,subtotal:a.Subtotal,shippingCost:a.Shipping_Cost,discount:a.Discount,otherFee:a.Other_Fee,vatAmount:a.VAT_Amount,totalAmount:a.Total_Amount,adjustmentReason:a.Adjustment_Reason,approvalHistory:JSON.parse(a.Approval_History||'[]'),pdfUrl:p.pdfUrl}}];`;
fs.writeFileSync(output,JSON.stringify(w,null,2)+'\n','utf8');
console.log(output);
