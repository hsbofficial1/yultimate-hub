import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ImportStep = 'upload' | 'mapping' | 'review' | 'importing' | 'complete';

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  name?: string;
  age?: string;
  gender?: string;
  school?: string;
  community?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_whatsapp?: string;
  medical_notes?: string;
  join_date?: string;
  [key: string]: string | undefined;
}

const defaultFields = [
  { key: 'name', label: 'Name', required: true },
  { key: 'age', label: 'Age', required: true },
  { key: 'gender', label: 'Gender', required: true },
  { key: 'school', label: 'School', required: false },
  { key: 'community', label: 'Community', required: false },
  { key: 'parent_name', label: 'Parent Name', required: true },
  { key: 'parent_phone', label: 'Parent Phone', required: true },
  { key: 'parent_whatsapp', label: 'Parent WhatsApp', required: false },
  { key: 'medical_notes', label: 'Medical Notes', required: false },
  { key: 'join_date', label: 'Join Date', required: false },
];

export const BulkImportWizard = ({ open, onOpenChange, onSuccess }: BulkImportWizardProps) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const mappingSchema = z.object({
    name: z.string().min(1, 'Name mapping is required'),
    age: z.string().min(1, 'Age mapping is required'),
    gender: z.string().min(1, 'Gender mapping is required'),
    parent_name: z.string().min(1, 'Parent name mapping is required'),
    parent_phone: z.string().min(1, 'Parent phone mapping is required'),
  });

  const form = useForm({
    resolver: zodResolver(mappingSchema),
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            title: 'CSV parsing errors',
            description: results.errors.map((e) => e.message).join(', '),
            variant: 'destructive',
          });
        }

        const data = results.data as CSVRow[];
        if (data.length === 0) {
          toast({
            title: 'Empty file',
            description: 'The CSV file appears to be empty',
            variant: 'destructive',
          });
          return;
        }

        setCsvData(data);
        setCsvHeaders(Object.keys(data[0] || {}));
        setStep('mapping');
      },
      error: (error) => {
        toast({
          title: 'Error parsing CSV',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  const handleMappingComplete = () => {
    const mapping = columnMapping;
    const errors: Array<{ row: number; error: string }> = [];
    const processedData: any[] = [];

    csvData.forEach((row, index) => {
      try {
        const mappedRow: any = {};
        
        // Map all fields
        defaultFields.forEach((field) => {
          const csvColumn = mapping[field.key];
          if (csvColumn && row[csvColumn]) {
            mappedRow[field.key] = row[csvColumn].trim();
          }
        });

        // Validate required fields
        if (!mappedRow.name || !mappedRow.age || !mappedRow.gender || !mappedRow.parent_name || !mappedRow.parent_phone) {
          errors.push({
            row: index + 2, // +2 because row 1 is header, and we're 0-indexed
            error: 'Missing required fields',
          });
          return;
        }

        // Convert age to number
        const age = parseInt(mappedRow.age);
        if (isNaN(age) || age < 5 || age > 18) {
          errors.push({
            row: index + 2,
            error: 'Invalid age',
          });
          return;
        }

        // Validate gender
        if (!['male', 'female', 'other'].includes(mappedRow.gender.toLowerCase())) {
          errors.push({
            row: index + 2,
            error: 'Invalid gender (must be male, female, or other)',
          });
          return;
        }

        // Parse date if provided
        if (mappedRow.join_date) {
          const date = new Date(mappedRow.join_date);
          if (isNaN(date.getTime())) {
            mappedRow.join_date = new Date().toISOString().split('T')[0];
          } else {
            mappedRow.join_date = date.toISOString().split('T')[0];
          }
        } else {
          mappedRow.join_date = new Date().toISOString().split('T')[0];
        }

        processedData.push(mappedRow);
      } catch (error: any) {
        errors.push({
          row: index + 2,
          error: error.message || 'Unknown error',
        });
      }
    });

    if (processedData.length === 0) {
      toast({
        title: 'No valid rows',
        description: 'All rows had validation errors',
        variant: 'destructive',
      });
      return;
    }

    setCsvData(processedData as CSVRow[]);
    setStep('review');
  };

  const handleImport = async () => {
    setStep('importing');
    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        const insertData: any = {
          name: row.name,
          age: parseInt(row.age),
          gender: row.gender.toLowerCase(),
          school: row.school || null,
          community: row.community || null,
          parent_name: row.parent_name,
          parent_phone: row.parent_phone,
          parent_whatsapp: row.parent_whatsapp || null,
          medical_notes: row.medical_notes || null,
          join_date: row.join_date || new Date().toISOString().split('T')[0],
          active: true,
        };

        const { error } = await supabase.from('children').insert(insertData);

        if (error) {
          throw error;
        }

        successCount++;
      } catch (error: any) {
        failedCount++;
        errors.push({
          row: i + 2,
          error: error.message || 'Unknown error',
        });
      }
    }

    setImportResults({
      success: successCount,
      failed: failedCount,
      errors,
    });
    setStep('complete');
    onSuccess?.();
  };

  const resetWizard = () => {
    setStep('upload');
    setCsvData([]);
    setCsvHeaders([]);
    setColumnMapping({});
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Children</DialogTitle>
          <DialogDescription>
            Import multiple children profiles from a CSV file
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {(['upload', 'mapping', 'review', 'importing', 'complete'] as ImportStep[]).map((s, index) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2',
                  step === s && 'border-primary bg-primary text-primary-foreground',
                  ['complete', 'review', 'importing'].includes(step) && index < 2 && 'border-primary bg-primary text-primary-foreground',
                  step !== s && !['complete', 'review', 'importing'].includes(step) && index < 2 && 'border-primary/50',
                  'border-muted'
                )}
              >
                {index + 1}
              </div>
              {index < 4 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    step === 'complete' || step === 'review' || step === 'importing' ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a CSV file with child profile information
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Choose CSV File
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>CSV Format:</strong> Your CSV should include columns for: Name, Age, Gender, Parent Name, Parent Phone, and optionally School, Community, Parent WhatsApp, Medical Notes, and Join Date.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Map CSV Columns</h3>
            <p className="text-sm text-muted-foreground">
              Match your CSV columns to the child profile fields
            </p>

            <div className="space-y-4">
              {defaultFields.map((field) => (
                <div key={field.key} className="flex items-center gap-4">
                  <label className="w-40 text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </label>
                  <Select
                    value={columnMapping[field.key] || ''}
                    onValueChange={(value) => {
                      setColumnMapping((prev) => ({
                        ...prev,
                        [field.key]: value,
                      }));
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {csvHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button
                onClick={handleMappingComplete}
                disabled={
                  !columnMapping.name ||
                  !columnMapping.age ||
                  !columnMapping.gender ||
                  !columnMapping.parent_name ||
                  !columnMapping.parent_phone
                }
              >
                Review Data
              </Button>
            </div>
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Review Import Data</h3>
              <Badge variant="outline">{csvData.length} rows</Badge>
            </div>

            <div className="border rounded-lg max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.age}</TableCell>
                      <TableCell className="capitalize">{row.gender}</TableCell>
                      <TableCell>{row.parent_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Ready</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {csvData.length > 10 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing first 10 of {csvData.length} rows
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button onClick={handleImport}>
                Import {csvData.length} Records
              </Button>
            </div>
          </div>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <div className="space-y-4 text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <h3 className="text-lg font-semibold">Importing...</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we import the children profiles
            </p>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && importResults && (
          <div className="space-y-4">
            <div className="text-center py-4">
              {importResults.failed === 0 ? (
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              ) : (
                <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              )}
              <h3 className="text-lg font-semibold mb-2">Import Complete</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>{importResults.success} successful</span>
                </div>
                {importResults.failed > 0 && (
                  <div className="flex items-center justify-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span>{importResults.failed} failed</span>
                  </div>
                )}
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div className="border rounded-lg max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResults.errors.slice(0, 20).map((error, index) => (
                      <TableRow key={index}>
                        <TableCell>{error.row}</TableCell>
                        <TableCell className="text-destructive">{error.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={resetWizard}>
                Import Another File
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}

        {step !== 'complete' && step !== 'importing' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

