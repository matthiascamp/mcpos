VERSION 5.00
Object = "{CCB90150-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSPOSPrinter.ocx"
Begin VB.Form Step2 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 2  Print various types of characters."
   ClientHeight    =   2340
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   6360
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   ScaleHeight     =   2340
   ScaleWidth      =   6360
   Begin VB.CommandButton cmdExit 
      Cancel          =   -1  'True
      Caption         =   "Close"
      Height          =   330
      Left            =   3720
      TabIndex        =   2
      Top             =   1680
      Width           =   1065
   End
   Begin VB.Frame Frame1 
      Caption         =   "Receipt"
      Height          =   1170
      Left            =   1440
      TabIndex        =   0
      Top             =   210
      Width           =   3375
      Begin VB.CommandButton cmdPrint 
         Caption         =   "Print"
         Height          =   435
         Left            =   315
         TabIndex        =   1
         Top             =   420
         Width           =   2775
      End
   End
   Begin OposPOSPrinter_CCOCtl.OPOSPOSPrinter OPOSPOSPrinter1 
      Left            =   3000
      OleObjectBlob   =   "Step2.frx":0000
      Top             =   1560
   End
End
Attribute VB_Name = "Step2"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 2  Print various types of characters.
Option Explicit

Private Sub cmdPrint_Click()

    Dim ESC As String * 1
    Dim fDate As String

'Initialization
    ESC = Chr(&H1B)                                     'ESC command
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")           'system date

    With OPOSPOSPrinter1
    'print
        'Print address
        '   ESC|N = Normal char
        .PrintNormal PTR_S_RECEIPT, ESC + "|N" + "123xxstreet,xxxcity,xxxxstate " + vbLf
        'Print phone number
        '   ESC|rA = Right side char
        .PrintNormal PTR_S_RECEIPT, ESC + "|rA" + "TEL 9999-99-9999   C#2" + vbLf
        'Print date
        '   ESC|cA = Centaring char
        .PrintNormal PTR_S_RECEIPT, ESC + "|cA" + fDate + vbCrLf + vbCrLf
        'Print buying goods
        .PrintNormal PTR_S_RECEIPT, "apples                  $20.00" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, "grapes                  $30.00" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, "bananas                 $40.00" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, "lemons                  $50.00" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, "oranges                 $60.00" + vbCrLf + vbCrLf
        'Print the total cost
        '   ESC|bC = Bold
        '   ESC|uC = Underline
        '   ESC|2C = Wide charcter
        .PrintNormal PTR_S_RECEIPT, ESC + "|bC" + "Tax excluded.          $200.00" + ESC + "|N" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + "Tax  5.0%               $10.00" + ESC + "|N" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|bC" + ESC + "|2C" + "Total   $210.00" + ESC + "|N" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, "Customer's payment     $250.00" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, "Change                  $40.00" + vbCrLf + vbCrLf

        'Feed the receipt to the cutter position automatically, and cut.
        '   ESC|#fP = Line Feed and Paper cut
        .PrintNormal PTR_S_RECEIPT, ESC + "|fP"
    End With

End Sub


Private Sub cmdExit_Click()

    Unload Me

End Sub


Private Sub Form_Load()

    With OPOSPOSPrinter1
        .Open "Unit1"
        .ClaimDevice 1000
        .DeviceEnabled = True
    End With

End Sub


Private Sub Form_Unload(Cancel As Integer)

    With OPOSPOSPrinter1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub


