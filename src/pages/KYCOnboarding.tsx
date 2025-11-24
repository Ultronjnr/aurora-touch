import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, Shield, CreditCard } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const KYCOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Auto-filled from auth
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  
  // Banking details to collect
  const [accountNumber, setAccountNumber] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [accountType, setAccountType] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Fetch profile and role data
    const fetchUserData = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setEmail(user.email || "");
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        setRole(userRole?.role || "");

        // If KYC already completed, redirect to dashboard
        if (profile.kyc_completed) {
          navigate("/dashboard");
        }
      }
    };

    fetchUserData();
  }, [user, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      setIdFile(file);
    }
  };

  const uploadIDDocument = async (): Promise<string | null> => {
    if (!idFile || !user) return null;

    setUploading(true);
    const fileExt = idFile.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from("id-documents")
      .upload(fileName, idFile);

    setUploading(false);

    if (uploadError) {
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      return null;
    }

    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    if (!accountNumber || !branchCode || !accountType) {
      toast({
        title: "Missing information",
        description: "Please fill in all banking details",
        variant: "destructive",
      });
      return;
    }

    if (!idFile) {
      toast({
        title: "ID document required",
        description: "Please upload your ID document",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Upload ID document first
    const idDocumentUrl = await uploadIDDocument();

    if (!idDocumentUrl) {
      setLoading(false);
      return;
    }

    // Update profile with all KYC data
    const { error } = await supabase
      .from("profiles")
      .update({
        account_number: accountNumber,
        branch_code: branchCode,
        account_type: accountType,
        id_document_url: idDocumentUrl,
        kyc_completed: true,
        id_verified: true, // Mark as verified after KYC completion
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "KYC Completed!",
        description: "Your account is now fully verified",
      });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="w-full max-w-2xl z-10 space-y-6 animate-slide-up">
        <Button
          variant="ghost"
          onClick={() => navigate("/auth")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <GlassCard>
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Shield className="w-16 h-16 mx-auto text-secondary" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Complete Your Profile
              </h1>
              <p className="text-foreground/60">
                We need a few more details to verify your account and enable secure transactions
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Auto-filled Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-secondary" />
                  Account Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={fullName} disabled className="bg-muted/30" />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={email} disabled className="bg-muted/30" />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={phone} disabled className="bg-muted/30" />
                  </div>

                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Input 
                      value={role === "requester" ? "Requester" : "Supporter"} 
                      disabled 
                      className="bg-muted/30" 
                    />
                  </div>
                </div>
              </div>

              {/* Banking Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-secondary" />
                  Banking Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number *</Label>
                    <Input
                      id="accountNumber"
                      type="text"
                      placeholder="1234567890"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                      className="bg-input/50 border-border/50 focus:border-secondary transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branchCode">Branch Code *</Label>
                    <Input
                      id="branchCode"
                      type="text"
                      placeholder="123456"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                      required
                      className="bg-input/50 border-border/50 focus:border-secondary transition-all"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="accountType">Account Type *</Label>
                    <Select value={accountType} onValueChange={setAccountType} required>
                      <SelectTrigger className="bg-input/50 border-border/50 focus:border-secondary transition-all">
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings Account</SelectItem>
                        <SelectItem value="current">Current Account</SelectItem>
                        <SelectItem value="cheque">Cheque Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* ID Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Upload className="w-5 h-5 text-secondary" />
                  Identity Verification
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="idDocument">Upload ID Document *</Label>
                  <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-secondary transition-all">
                    <input
                      id="idDocument"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="idDocument" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                      {idFile ? (
                        <p className="text-sm font-medium text-secondary">
                          {idFile.name}
                        </p>
                      ) : (
                        <>
                          <p className="text-sm font-medium">
                            Click to upload ID document
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            JPG, PNG or PDF (Max 5MB)
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || uploading}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                {loading || uploading ? "Submitting..." : "Complete Verification"}
              </Button>
            </form>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default KYCOnboarding;
