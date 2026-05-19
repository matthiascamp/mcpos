VERSION 5.00
Object = "{CCB90080-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSTotals.ocx"
Begin VB.Form Step4 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 4 Process files"
   ClientHeight    =   3060
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   5580
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3060
   ScaleWidth      =   5580
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   4305
      TabIndex        =   9
      Top             =   2520
      Width           =   990
   End
   Begin VB.CommandButton Command5 
      Caption         =   "Delete"
      Height          =   330
      Left            =   315
      TabIndex        =   5
      Top             =   1365
      Width           =   1305
   End
   Begin VB.TextBox Text4 
      Height          =   270
      Left            =   1785
      TabIndex        =   4
      Top             =   840
      Width           =   1485
   End
   Begin VB.TextBox Text3 
      Height          =   270
      Left            =   1785
      TabIndex        =   2
      Top             =   315
      Width           =   1485
   End
   Begin VB.CommandButton Command4 
      Caption         =   "Change"
      Height          =   330
      Left            =   315
      TabIndex        =   3
      Top             =   840
      Width           =   1305
   End
   Begin VB.CommandButton Command3 
      Caption         =   "Create"
      Height          =   330
      Left            =   315
      TabIndex        =   1
      Top             =   315
      Width           =   1305
   End
   Begin VB.ListBox List1 
      Height          =   1035
      Left            =   3780
      TabIndex        =   0
      Top             =   420
      Width           =   1485
   End
   Begin VB.TextBox Text1 
      Height          =   270
      Left            =   1785
      TabIndex        =   7
      Top             =   1995
      Width           =   3480
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Register"
      Height          =   345
      Left            =   315
      TabIndex        =   6
      Top             =   1995
      Width           =   1305
   End
   Begin OposTotals_CCOCtl.OPOSTotals OPOSTotals1 
      Left            =   3720
      OleObjectBlob   =   "Totals4.frx":0000
      Top             =   2400
   End
   Begin VB.Label Label1 
      Caption         =   "File List"
      Height          =   225
      Left            =   3780
      TabIndex        =   8
      Top             =   210
      Width           =   1485
   End
End
Attribute VB_Name = "Step4"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 4 Process files
Option Explicit

' Make a list of the all files
'
Sub ListRefresh()

    Dim i As Integer
    Dim pFileName As String
    
    pFileName = ""

    OPOSTotals1.FindByIndex 0, pFileName
    List1.Clear
    Do
        i = InStr(pFileName, vbCr)
        If i = 0 Then Exit Do
        List1.AddItem Left(pFileName, i - 1)
        pFileName = Mid(pFileName, i + 1)
    Loop

End Sub

Private Sub cmdExit_Click()

    Unload Me

End Sub

' Write information in the selected file
'
Private Sub Command1_Click()

    Dim pSize As Long
    Dim pHandle As Long

    OPOSTotals1.Find List1.Text, pHandle, pSize
    OPOSTotals1.Write pHandle, Text1.Text, 0, LenDBCS(Text1.Text)

End Sub

' Make files
'
Private Sub Command3_Click()

    Dim pHandle As Long

' Create a file name using the text input into the box. Creat it with 128bytes.
    OPOSTotals1.Create Text3.Text, pHandle, 128, False

    Call ListRefresh                    ' Update the file list.

End Sub

' Modify a file name selected on the list.
'
Private Sub Command4_Click()

    Dim pSize As Long
    Dim pHandle As Long

' Request for a file handle.
    OPOSTotals1.Find List1.Text, pHandle, pSize
' Modigy a file name as input into the text box, using the requested file handle.
    OPOSTotals1.Rename pHandle, Text4.Text

    Call ListRefresh                    ' Update the file list.

End Sub

' Delete the selected files
'
Private Sub Command5_Click()

    OPOSTotals1.Delete List1.Text

    Call ListRefresh                    ' Update the file list.

End Sub


Private Sub Form_Load()

    With OPOSTotals1
        .Open "Unit1"
        .ClaimDevice 1000
        .DeviceEnabled = True
    End With

    Call ListRefresh                    ' Update the file list.

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSTotals1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub


'Handle when a file is selected on the list.
'
Private Sub List1_Click()

    Dim pHandle As Long
    Dim pSize As Long
    Dim pData As String
    
    pData = ""

' Copy the selected file name to (Change) button.
    Text4.Text = List1.Text

' Request a file handle from the selected file name.
    OPOSTotals1.Find List1.Text, pHandle, pSize
' Read a registered information from the requested file handle, and display it.
    OPOSTotals1.Read pHandle, pData, 0, pSize
    Text1.Text = pData

End Sub

Function LenDBCS(Data As String) As Long

    Dim i As Integer
    Dim m As Integer
    Dim c As Integer

    m = Len(Data)
    c = 0
    
    For i = 1 To m
        If Asc(Mid(Data, i, 1)) < 0 Then c = c + 1
    Next i

    LenDBCS = m + c

End Function
