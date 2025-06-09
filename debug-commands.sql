None of these queries should return records, if they do something is wrong

SELECT Tags_Namespaces_PK_Hash FROM Tags_Namespaces GROUP BY Tags_Namespaces_PK_Hash HAVING COUNT(*) > 1;
SELECT Local_Tags_PK_Hash FROM Local_Tags GROUP BY Local_Tags_PK_Hash HAVING COUNT(*) > 1;
SELECT File_Hash FROM Files GROUP BY File_Hash HAVING COUNT(*) > 1;
SELECT * FROM Files WHERE File_Hash IN (SELECT Thumbnail_Hash FROM Files);
SELECT * FROM Files WHERE File_Hash IN (SELECT Prethumbnail_Hash FROM Files);