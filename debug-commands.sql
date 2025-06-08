None of these queries should return records, if they do something is wrong

SELECT Tags_Namespaces_PK_Hash FROM Tags_Namespaces GROUP BY Tags_Namespaces_PK_Hash HAVING COUNT(*) > 1;
SELECT Local_Tags_PK_Hash FROM Local_Tags GROUP BY Local_Tags_PK_Hash HAVING COUNT(*) > 1;